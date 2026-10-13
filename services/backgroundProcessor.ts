import { useJournalStore, JournalEntry } from '../store/journalStore';
import { useNotificationStore } from '../store/notificationStore';
import { generatePatternAnalysis, generateMoodTrendTips, generateForYouCards, generateInsights, MoodTrendTip } from './offlineAI';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export const FOR_YOU_CARDS_KEY = 'ugood_for_you_cards';
const MOOD_TRENDS_KEY = 'ugood_mood_trends';
const PIPELINE_COOLDOWN_KEY = 'ugood_pipeline_last_run';
const PIPELINE_COOLDOWN_MS = 1 * 60 * 60 * 1000; // 1 hour between full pipeline runs

/**
 * Agentic Background Processor — 5-step sequential pipeline.
 * Each step feeds into the next. All LLM tasks go through the priority queue.
 */
export const BackgroundProcessor = {

    /**
     * Run the full 5-step pipeline sequentially.
     */
    async runPipeline(userId: string) {
        try {
            // Check pipeline cooldown
            const PIPELINE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours
            const lastPipelineRun = await AsyncStorage.getItem(PIPELINE_COOLDOWN_KEY);
            const now = Date.now();
            
            if (lastPipelineRun && (now - parseInt(lastPipelineRun, 10)) < PIPELINE_TIMEOUT_MS) {
                console.log('[Pipeline] ⏳ 12-hour cooldown active. Skipping background pipeline run.');
                return;
            }
            await AsyncStorage.setItem(PIPELINE_COOLDOWN_KEY, now.toString());

            const entries = useJournalStore.getState().entries;
            if (entries.length < 3) {
                console.log(`[Pipeline] Not enough entries (${entries.length}/3). Skipping.`);
                return;
            }

            console.log('[Pipeline] Starting 5-step agentic pipeline...');

            // ── Step 1: Mood Math (no LLM) ──
            const trendingMoods = await this.step1_moodMath(entries);

            // ── Step 2: Pattern Analysis (LLM → Pattern Card) ──
            await this.step2_patternAnalysis(userId, entries, trendingMoods);

            // ── Step 3: Curated Mood Tips (LLM) ──
            await this.step3_moodTrendTips(userId, trendingMoods, entries);

            // ── Step 4: For You Cards (LLM) ──
            await this.step4_forYouCards(entries);

            // ── Step 5: Inactivity Check (no LLM) ──
            await this.step5_inactivityCheck(entries);

            // ── Step 6: Pre-generate Lessons (LLM, P3) ──
            await this.step6_preGenerateLessons(userId, entries);

            console.log('[Pipeline] Complete ✅');
        } catch (error: any) {
            console.error('[Pipeline] Error:', error.message);
        }
    },

    /**
     * Step 1: Count ALL moods from last 6 entries. Pure math, no LLM.
     */
    async step1_moodMath(entries: JournalEntry[]): Promise<{ label: string; percentage: number; entryIds: string[] }[]> {
        console.log('[Step 1] Mood Math: Analyzing last 6 entries...');

        const recent = entries.slice(0, 6);
        const moodCounts: Record<string, { count: number; entryIds: string[] }> = {};
        let totalTags = 0;

        recent.forEach(entry => {
            if (!entry.mood) return;
            // Parse ALL comma-separated moods
            const moods = entry.mood.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
            moods.forEach(mood => {
                if (!moodCounts[mood]) {
                    moodCounts[mood] = { count: 0, entryIds: [] };
                }
                moodCounts[mood].count++;
                if (!moodCounts[mood].entryIds.includes(entry.id)) {
                    moodCounts[mood].entryIds.push(entry.id);
                }
                totalTags++;
            });
        });

        if (totalTags === 0) {
            console.log('[Step 1] No mood data found.');
            return [];
        }

        const sorted = Object.entries(moodCounts)
            .map(([label, data]) => ({
                label,
                percentage: Math.round((data.count / totalTags) * 100),
                entryIds: data.entryIds,
            }))
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 3);

        console.log(`[Step 1] Top moods: ${sorted.map(m => `${m.label}(${m.percentage}%)`).join(', ')}`);

        // Save trending data (tiny — ~200 bytes)
        await AsyncStorage.setItem(MOOD_TRENDS_KEY, JSON.stringify(sorted));

        return sorted;
    },

    /**
     * Step 2: Pattern Analysis → feeds the Pattern Alert Card.
     */
    async step2_patternAnalysis(
        userId: string,
        entries: JournalEntry[],
        trendingMoods: { label: string; percentage: number }[]
    ) {
        console.log('[Step 2] Pattern Analysis: Checking cooldown...');
        
        // Only run pattern analysis once a week (7 days)
        const PATTERN_COOLDOWN_KEY = 'ugood_pattern_last_run';
        const lastRun = await AsyncStorage.getItem(PATTERN_COOLDOWN_KEY);
        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

        if (lastRun && (now - parseInt(lastRun, 10)) < SEVEN_DAYS_MS) {
            console.log('[Step 2] ⏳ Skipping pattern analysis (Weekly cooldown active).');
            return;
        }

        console.log('[Step 2] Pattern Analysis: Detecting stagnation...');

        const moodContext = trendingMoods.map(m => `${m.label}(${m.percentage}%)`).join(', ');
        const insight = await generatePatternAnalysis(entries, moodContext);
        if (!insight) {
            console.log('[Step 2] No pattern detected.');
            return;
        }

        // Save to Supabase notifications (type: past_self → renders as Pattern Card)
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type: 'past_self',
                title: insight.title,
                content: insight.analysis,
                read: false,
            });

        if (error) {
            console.error('[Step 2] Save error:', error.message);
            return;
        }

        // Fire push notification
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Your past self noticed something 💭",
                body: "A new pattern showed up in your reflections. Take a look when you're ready.",
                data: { screen: '/notifications' },
            },
            trigger: {
                seconds: 4 * 60 * 60 // Delay for 4 hours
            } as any,
        });

        await useNotificationStore.getState().fetchNotifications(userId);
        
        // Update the cooldown timestamp
        await AsyncStorage.setItem(PATTERN_COOLDOWN_KEY, now.toString());
        
        console.log(`[Step 2] ✅ Pattern saved: "${insight.title}"`);
    },

    /**
     * Step 3: Curated Mood Tips — asks WHY trending moods recur.
     */
    async step3_moodTrendTips(
        userId: string,
        trendingMoods: { label: string; percentage: number; entryIds: string[] }[],
        entries: JournalEntry[]
    ) {
        if (trendingMoods.length === 0) {
            console.log('[Step 3] No trending moods. Skipping.');
            return;
        }

        // Only run mood tips once a day (24 hours)
        const MOOD_TIP_COOLDOWN_KEY = 'ugood_moodtip_last_run';
        const lastMoodTipRun = await AsyncStorage.getItem(MOOD_TIP_COOLDOWN_KEY);
        const now = Date.now();
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

        if (lastMoodTipRun && (now - parseInt(lastMoodTipRun, 10)) < TWENTY_FOUR_HOURS_MS) {
            console.log('[Step 3] ⏳ Skipping mood tips (24-hour cooldown active).');
            return;
        }

        console.log('[Step 3] Mood Trend Tips: Analyzing why moods recur...');

        // Get entries associated with trending moods
        const trendingEntryIds = new Set(trendingMoods.flatMap(m => m.entryIds));
        const associatedEntries = entries.filter(e => trendingEntryIds.has(e.id));

        const tips = await generateMoodTrendTips(trendingMoods, associatedEntries);
        if (!tips || tips.length === 0) {
            console.log('[Step 3] No tips generated.');
            return;
        }

        // Save each tip as a notification
        const tipContent = tips.map((t: MoodTrendTip) => `${t.mood}: ${t.tip}`).join('\n\n');

        await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type: 'tip',
                title: 'Mood Insights',
                content: tipContent,
                read: false,
            });

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Something for you 💡",
                body: "I put together a few thoughts based on how you've been feeling lately.",
                data: { screen: '/notifications' },
            },
            trigger: {
                seconds: 4 * 60 * 60 // Delay for 4 hours
            } as any,
        });

        await useNotificationStore.getState().fetchNotifications(userId);
        
        await AsyncStorage.setItem(MOOD_TIP_COOLDOWN_KEY, now.toString());
        
        console.log(`[Step 3] ✅ ${tips.length} mood tips saved`);
    },

    /**
     * Step 4: For You Cards — 2 personalized card topics.
     */
    async step4_forYouCards(entries: JournalEntry[]) {
        console.log('[Step 4] For You Cards: Generating topics...');

        const cards = await generateForYouCards(entries);
        if (cards && cards.length > 0) {
            await AsyncStorage.setItem(FOR_YOU_CARDS_KEY, JSON.stringify(cards));

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Your page just updated ✨",
                    body: "New focus areas are ready based on your recent reflections.",
                    data: { screen: '/(tabs)' },
                },
                trigger: null,
            });

            console.log(`[Step 4] ✅ ${cards.length} cards saved`);
        } else {
            console.log('[Step 4] No cards generated.');
        }
    },

    /**
     * Step 5: Inactivity Check — nudge if no journal in 24h.
     */
    async step5_inactivityCheck(entries: JournalEntry[]) {
        console.log('[Step 5] Inactivity Check...');

        if (entries.length === 0) {
            console.log('[Step 5] No entries at all — skipping (onboarding will handle).');
            return;
        }

        const lastEntry = entries[0]; // Already sorted newest first
        const hoursSince = (Date.now() - new Date(lastEntry.created_at).getTime()) / (1000 * 60 * 60);

        if (hoursSince >= 24) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Just checking in 🤍",
                    body: "One minute. That's all it takes to talk to your future self.",
                    data: { screen: '/journal/emotions' },
                },
                trigger: null,
            });
            console.log(`[Step 5] ✅ Inactivity alert sent (${Math.round(hoursSince)}h since last entry)`);
        } else {
            console.log(`[Step 5] Last entry ${Math.round(hoursSince)}h ago — no alert needed.`);
        }
    },

    /**
     * Step 6: Pre-generate Lessons for recent entries missing insights.
     */
    async step6_preGenerateLessons(userId: string, entries: JournalEntry[]) {
        console.log('[Step 6] Pre-generating lessons for recent entries...');

        const recentEntries = entries.slice(0, 3); // Last 3 entries
        let generated = 0;

        for (const entry of recentEntries) {
            // Check if insight already exists
            const { data: existing } = await supabase
                .from('insights')
                .select('id')
                .eq('entry_id', entry.id)
                .single();

            if (existing) continue; // Already has a lesson

            try {
                const content = `${entry.title || 'Untitled'}\n\n${entry.content}`;
                const insights = await generateInsights(content, entry.mood, entries);

                await supabase.from('insights').upsert({
                    entry_id: entry.id,
                    user_id: userId,
                    summary: insights.summary,
                    lesson: insights.lessons.join('\n\n'),
                    mood_analysis: insights.moodAnalysis,
                    reflection_prompt: insights.reflectionPrompt,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'entry_id' });

                generated++;
                console.log(`[Step 6] ✅ Lesson pre-generated for entry ${entry.id}`);
            } catch (e: any) {
                console.warn(`[Step 6] Failed for entry ${entry.id}:`, e.message);
            }
        }

        console.log(`[Step 6] Done. ${generated} new lessons generated.`);
    },
};
