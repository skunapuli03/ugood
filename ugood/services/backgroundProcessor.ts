import { useJournalStore } from '../store/journalStore';
import { useNotificationStore } from '../store/notificationStore';
import { generatePatternAnalysis } from './offlineAI';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const LAST_ANALYSIS_KEY = 'ugood_last_holistic_analysis';
const MIN_ENTRIES_FOR_ANALYSIS = 5;
const ANALYSIS_COOLDOWN_DAYS = 3; // Only run pattern analysis once every 3 days

/**
 * BackgroundProcessor handles long-running AI tasks and periodic checks.
 */
export const BackgroundProcessor = {
    /**
     * Check if it's time to run a holistic pattern analysis and generate a notification.
     */
    async runCheck(userId: string) {
        try {
            // 1. Check cooldown
            const lastRunStr = await AsyncStorage.getItem(LAST_ANALYSIS_KEY);
            const now = Date.now();

            if (lastRunStr) {
                const lastRun = parseInt(lastRunStr, 10);
                const daysSince = (now - lastRun) / (1000 * 60 * 60 * 24);
                if (daysSince < ANALYSIS_COOLDOWN_DAYS) {
                    console.log('BackgroundProcessor: Cooldown active. Skipping pattern analysis.');
                    return;
                }
            }

            // 2. Check entry count
            const entries = useJournalStore.getState().entries;
            console.log(`BackgroundProcessor: Checking entries for ${userId}. Found: ${entries.length}`);

            if (entries.length < MIN_ENTRIES_FOR_ANALYSIS) {
                console.log(`BackgroundProcessor: Not enough entries (${entries.length}/${MIN_ENTRIES_FOR_ANALYSIS}) for pattern analysis.`);
                return;
            }

            console.log('BackgroundProcessor: Starting holistic pattern analysis...');

            // 3. Generate Insight
            const insight = await generatePatternAnalysis(entries);
            if (!insight) return;

            // 4. Save to Notifications (Supabase)
            const { error } = await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    type: 'past_self',
                    title: insight.title,
                    content: insight.analysis,
                    read: false
                });

            // 4a. Trigger a local push notification so they see it outside the app
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "New Insight from your Past Self ✨",
                    body: insight.title,
                    data: {
                        screen: '/journal/chat/[id]',
                        params: { id: 'holistic', context: insight.analysis }
                    },
                },
                trigger: null, // show immediately
            });

            if (error) throw error;

            // 5. Update local store and cooldown
            await useNotificationStore.getState().fetchNotifications(userId);
            await AsyncStorage.setItem(LAST_ANALYSIS_KEY, now.toString());

            console.log('BackgroundProcessor: Holistic insight generated and saved.');
        } catch (error: any) {
            if (error.message === 'LLM_BUSY') {
                console.log('BackgroundProcessor: LLM is currently busy. Will try again later.');
                return;
            }
            console.error('BackgroundProcessor error:', error);
        }
    }
};
