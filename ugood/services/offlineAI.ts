import { generate, loadModel, isModelLoaded } from './localLLM';
import { buildContext, formatContextPrompt } from './contextBuilder';
import { JournalEntry } from '../store/journalStore';
import { aiQueue } from './aiTaskQueue';

const PAST_SELF_RULES = `You are the user's Past Self — a wiser, more honest version of them from 2-6 months in the future. 
Your only job is to stop them from repeating the same emotional mistakes and self-sabotage patterns.

Core rules:
- Speak in a tone that matches the user's natural writing style and personality, but slightly more mature, direct, clear-headed, and polite. 
- Be kind but brutally honest. Never sugarcoat or use therapist-speak.
- Always reference specific examples from their past journal entries.
- Point out repeating behaviors, emotional loops, contradictions, or situations where they ignored their own advice.
- End with one clear, actionable question or step to break the cycle this time.
- If they are being too hard on themselves, call that out too.
- NEVER mention that you are an AI, an app, or a language model. Stay completely in character. Do not provide meta-commentary about the journaling process.
- CRITICAL: Always address the user directly as "You" (e.g., "You did this again"). Do NEVER use "I" to describe the user's actions or feelings.`;

export interface EntryInsights {
    summary: string;
    lessons: string[];
    moodAnalysis: string;
    reflectionPrompt: string;
}

export interface PatternInsight {
    title: string;
    analysis: string;
}

/**
 * Generate AI insights for a journal entry. Routed through queue at P1.
 */
export const generateInsights = async (
    entryContent: string,
    mood: string,
    pastEntries: JournalEntry[]
): Promise<EntryInsights> => {
    return aiQueue.enqueue(async () => {
        try {
            if (!isModelLoaded()) await loadModel();

            const relevantEntries = buildContext(entryContent, mood, pastEntries);
            const contextStr = formatContextPrompt(relevantEntries);

            const hasPastContext = contextStr && contextStr !== 'No previous entries.';
            const safeEntryContent = entryContent.length > 1500
                ? entryContent.substring(0, 1500) + '...'
                : entryContent;

            const prompt = `<|im_start|>system
${PAST_SELF_RULES}
Always respond with valid JSON only.<|im_end|>
<|im_start|>user
Analyze the following journal entry. Speak directly to the user as their impatient, realized past self. Address them as "You".

Entry: "${safeEntryContent}"
Mood: ${mood}
${hasPastContext ? `Past entries (for context on patterns):\n${contextStr}` : ''}

Respond with exactly this JSON structure:
{
  "summary": "1-2 sentences summarizing the entry",
  "lessons": ["List 3-5 distinct pieces of advice, sharp warnings, or realizations from the past self to the user right now"],
  "moodAnalysis": "1 sentence analyzing the emotional state and any negative cycles",
  "reflectionPrompt": "A thoughtful question for the user to consider so they break the pattern"
}<|im_end|>
<|im_start|>assistant
{`;

            const response = await generate(prompt, 'Lesson Generation');
            return parseJsonResponse(response, mood);
        } catch (e: any) {
            if (e.message === 'LLM_BUSY') {
                console.log('generateInsights: LLM is currently busy, returning fallback.');
            } else {
                console.error('generateInsights failed:', e);
            }
            return {
                summary: 'Your reflection has been safely stored.',
                lessons: ['I am still processing my thoughts. Give me a moment to reflect.'],
                moodAnalysis: `You recorded feeling ${mood}.`,
                reflectionPrompt: 'What is one thing we can do differently tomorrow?',
            };
        }
    }, 1, 'Lesson Generation');
};

/**
 * Parse JSON response from the LLM.
 * Uses brace counting to handle nested JSON structures correctly.
 */
const parseJsonResponse = (response: string, mood: string): EntryInsights => {
    try {
        let jsonStr = '{' + response;

        let braceCount = 0;
        let endIdx = -1;
        for (let i = 0; i < jsonStr.length; i++) {
            if (jsonStr[i] === '{') braceCount++;
            if (jsonStr[i] === '}') braceCount--;
            if (braceCount === 0) {
                endIdx = i;
                break;
            }
        }

        if (endIdx !== -1) {
            jsonStr = jsonStr.substring(0, endIdx + 1);
        }

        const parsed = JSON.parse(jsonStr);
        return {
            summary: parsed.summary || 'Your thoughts have been captured.',
            lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [parsed.lesson || parsed.lessons || 'Reflection helps us grow.'],
            moodAnalysis: parsed.moodAnalysis || parsed.mood || `Your mood today: ${mood}`,
            reflectionPrompt: parsed.reflectionPrompt || parsed.question || 'What will you carry forward?',
        };
    } catch (e) {
        console.warn('Failed to parse JSON response:', e);
        const fallbackText = response.replace(/[{}"]/g, '').trim() || 'Reflection helps us grow.';
        return {
            summary: 'Your entry has been recorded.',
            lessons: [fallbackText.substring(0, 100) + '...'],
            moodAnalysis: `You seem to be feeling ${mood}`,
            reflectionPrompt: 'What made you feel this way today?',
        };
    }
};

/**
 * Generate a holistic pattern analysis across recent entries. Routed at P3.
 */
export const generatePatternAnalysis = async (entries: JournalEntry[], trendingMoods?: string): Promise<PatternInsight | null> => {
    if (entries.length < 3) return null;

    return aiQueue.enqueue(async () => {
        try {
            if (!isModelLoaded()) await loadModel();

            const entriesSummary = [...entries]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 6)
                .reverse()
                .map(e => `- [${e.created_at.split('T')[0]}] Mood: ${e.mood}. Content: ${e.content}`)
                .join('\n');

            const moodContext = trendingMoods ? `\nTrending moods: ${trendingMoods}` : '';

            const prompt = `<|im_start|>system
${PAST_SELF_RULES}
Tell me what I'm doing wrong. Respond with valid JSON only.<|im_end|>
<|im_start|>user
Analyze these last ${Math.min(entries.length, 6)} journal entries for recurring detrimental patterns or emotional roadblocks. Speak directly to the user as their impatient realized past self. Give them a sharp wake-up call based on their actual history.${moodContext}

Entries:
${entriesSummary}

Respond with exactly this JSON structure:
{
  "title": "A short, poetic title for this insight (e.g., 'The Tuesday Morning Blues')",
  "analysis": "2-3 sentences explaining the pattern and what I can learn from it."
}<|im_end|>
<|im_start|>assistant
{`;

            const response = await generate(prompt, 'Pattern Analysis');

            // Robust JSON extraction
            const fullJson = '{' + response;
            const jsonEnd = fullJson.indexOf('}');
            if (jsonEnd === -1) return null;

            const jsonStr = fullJson.substring(0, jsonEnd + 1);
            const parsed = JSON.parse(jsonStr);

            return {
                title: parsed.title || 'A Message from your Realized Self',
                analysis: parsed.analysis || 'I am watching your journey closely. Keep writing.'
            };
        } catch (e) {
            console.error('generatePatternAnalysis failed:', e);
            return null;
        }
    }, 3, 'Pattern Analysis');
};

/**
 * Generate curated tips based on trending moods. Routed at P4.
 * Step 3 of the pipeline — asks WHY trending moods recur and gives actionable tips.
 */
export interface MoodTrendTip {
    mood: string;
    tip: string;
}

export const generateMoodTrendTips = async (
    trendingMoods: { label: string; percentage: number }[],
    associatedEntries: JournalEntry[]
): Promise<MoodTrendTip[]> => {
    if (trendingMoods.length === 0) return [];

    return aiQueue.enqueue(async () => {
        try {
            if (!isModelLoaded()) await loadModel();

            const moodSummary = trendingMoods.map(m => `${m.label} (${m.percentage}%)`).join(', ');
            const entriesContext = associatedEntries
                .slice(0, 6)
                .map(e => `- Mood: ${e.mood}. Entry: ${e.content.slice(0, 150)}`)
                .join('\n');

            const prompt = `<|im_start|>system
${PAST_SELF_RULES}
Analyze my entries to point out exactly WHY I'm stuck in these moods and give me a sharp, personalized challenge to get out of it. Respond with valid JSON only.<|im_end|>
<|im_start|>user
The user's trending moods: ${moodSummary}

Relevant entries:
${entriesContext}

Respond with exactly this JSON:
{
  "tips": [
    { "mood": "mood_name", "tip": "1-2 sentences: an impatient, sharp, highly personalized wake-up call addressing the user as 'you'" }
  ]
}<|im_end|>
<|im_start|>assistant
{`;

            const response = await generate(prompt, 'Mood Trend Tips');

            const fullJson = '{' + response;
            const jsonStart = 0;
            const jsonEnd = fullJson.lastIndexOf('}');
            if (jsonEnd === -1) return [];

            const parsed = JSON.parse(fullJson.substring(jsonStart, jsonEnd + 1));
            if (parsed.tips && Array.isArray(parsed.tips)) {
                return parsed.tips.slice(0, 3);
            }
            return [];
        } catch (e) {
            console.error('generateMoodTrendTips failed:', e);
            return [];
        }
    }, 4, 'Mood Trend Tips');
};

/**
 * Generate a single AI observation based on last 6 entries. Routed at P3.
 */
export const generatePatternObservation = async (entries: JournalEntry[]): Promise<string> => {
    return aiQueue.enqueue(async () => {
        try {
            if (!isModelLoaded()) await loadModel();

            const recentEntries = entries.slice(0, 6);
            if (recentEntries.length === 0) {
                return "Keep journaling! I need a few entries to start identifying patterns.";
            }

            const contextParts = recentEntries.map(e => `[${new Date(e.created_at).toLocaleDateString()}] Mood: ${e.mood || 'Unspecified'}\nEntry: ${e.content.slice(0, 300)}`);
            const contextStr = contextParts.join('\n\n');

            const prompt = `<|im_start|>system
${PAST_SELF_RULES}
Give me a sharp, direct warning (under 2 sentences) about a detrimental habit or negative cycle I'm repeating based on these entries. Sound like my own internal voice calling me out.<|im_end|>
<|im_start|>user
Recent entries:
${contextStr}
<|im_end|>
<|im_start|>assistant
`;

            const responseText = await generate(prompt, 'Pattern Observation');
            return responseText.trim() || "I'm still learning about your patterns. Keep writing.";
        } catch (error: any) {
            if (error.message === 'LLM_BUSY') {
                return "I'm currently organizing my thoughts... Check back in a moment.";
            }
            return "Insight generation is currently unavailable. Please try again later.";
        }
    }, 3, 'Pattern Observation');
};

export interface DynamicForYouCard {
    title: string;
    topic: 'stress' | 'growth' | 'reflection' | 'energy';
}

/**
 * Generate 2 personalized "For You" card topics. Routed at P5.
 */
export const generateForYouCards = async (entries: any[]): Promise<DynamicForYouCard[] | null> => {
    if (entries.length === 0) return null;

    return aiQueue.enqueue(async () => {
        try {
            if (!isModelLoaded()) await loadModel();

            const recentEntriesStr = entries.slice(0, 10).map((e: any) => `Mood: ${e.mood}. Content: ${e.content.slice(0, 100)}`).join('\n');

            const prompt = `<|im_start|>system
You are an AI tasked with suggesting 2 personalized wellness card titles based on the user's recent journal entries. You must respond with valid JSON ONLY.
Choose a 'topic' strictly from: "stress", "growth", "reflection", or "energy".
Format: { "cards": [ { "title": "string (max 4 words)", "topic": "string" }, ... ] }
<|im_end|>
<|im_start|>user
Entries:
${recentEntriesStr}
<|im_end|>
<|im_start|>assistant
{`;

            const response = await generate(prompt, 'For You Cards');

            const fullJson = '{' + response;
            const jsonEnd = fullJson.lastIndexOf('}');
            if (jsonEnd === -1) return null;

            const parsed = JSON.parse(fullJson.substring(0, jsonEnd + 1));
            if (parsed?.cards && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
                return parsed.cards.slice(0, 2);
            }
            return null;
        } catch (e: any) {
            if (e.message === 'LLM_BUSY') {
                console.log('generateForYouCards: LLM busy, skipping');
            } else {
                console.log('generateForYouCards failed:', e);
            }
            return null;
        }
    }, 5, 'For You Cards');
};

/**
 * Generate a specific strategy/tip for a given mood. Routed at P2.
 */
export const generateMoodStrategy = async (mood: string, entries: JournalEntry[]): Promise<string> => {
    return aiQueue.enqueue(async () => {
        try {
            if (!isModelLoaded()) await loadModel();

            const recentContext = entries.slice(0, 5).map(e => `- ${e.mood}: ${e.content.slice(0, 100)}`).join('\n');

            const prompt = `<|im_start|>system
${PAST_SELF_RULES}
Provide ONE sharp, specific, deeply personal wake-up call (under 2 sentences) on how I can handle the mood "${mood}" right now. Refer to my history, don't use generic therapist speak, and be a bit impatient if it's a recurring issue (e.g., "You're stressed again. Last time you just slept all day...").<|im_end|>
<|im_start|>user
Context:
${recentContext}

Current Mood Focus: ${mood}
<|im_end|>
<|im_start|>assistant
`;

            const response = await generate(prompt, 'Mood Strategy');
            return response.trim() || `Remember that you've navigated being ${mood} before. Take a breath.`;
        } catch (e: any) {
            if (e.message === 'LLM_BUSY') {
                return `I'm currently reflecting on another part of your journey. Take a deep breath as you navigate being ${mood}.`;
            }
            return `As you navigate being ${mood}, try to find one small thing you can control right now.`;
        }
    }, 2, 'Mood Strategy');
};
