import { generate, loadModel, isModelLoaded } from './localLLM';
import { buildContext, formatContextPrompt } from './contextBuilder';
import { JournalEntry } from '../store/journalStore';

export interface EntryInsights {
    summary: string;
    lesson: string;
    moodAnalysis: string;
    reflectionPrompt: string;
}

/**
 * Generate AI insights for a journal entry using the local LLM.
 * Uses Qwen 2.5 1.5B by default with ChatML prompt format.
 */
export const generateInsights = async (
    entryContent: string,
    mood: string,
    pastEntries: JournalEntry[]
): Promise<EntryInsights> => {
    console.log('generateInsights called');
    try {
        if (!isModelLoaded()) {
            console.log('Model not loaded, loading now!');
            await loadModel();
            console.log('Model loaded successfully');
        }

        // Build context from relevant past entries
        const relevantEntries = buildContext(entryContent, mood, pastEntries);
        const contextStr = formatContextPrompt(relevantEntries);

        // Build ChatML prompt (Qwen format)
        const prompt = `<|im_start|>system
You are a compassionate journal companion. Analyze journal entries and provide supportive insights. Always respond with valid JSON only, no other text.<|im_end|>
<|im_start|>user
Analyze this journal entry and respond with JSON:

Entry: "${entryContent}"
Mood: ${mood}${contextStr ? `\n\nPast entries for context:\n${contextStr}` : ''}

Respond with this exact JSON structure:
{"summary": "2-3 sentence summary", "lesson": "key insight or lesson", "moodAnalysis": "emotional analysis", "reflectionPrompt": "thoughtful question ending with ?"}<|im_end|>
<|im_start|>assistant
{`;

        console.log('Generated prompt for LLM');
        const response = await generate(prompt);
        console.log('LLM raw response:', response.substring(0, 200));

        return parseJsonResponse(response, mood);
    } catch (e: any) {
        console.error('generateInsights failed:', e);
        return {
            summary: 'Your entry has been recorded.',
            lesson: 'Taking time to journal is a great habit.',
            moodAnalysis: `You seem to be feeling ${mood}`,
            reflectionPrompt: 'What made you feel this way today?',
        };
    }
};

/**
 * Parse JSON response from the LLM.
 * Uses brace counting to handle nested JSON structures correctly.
 */
const parseJsonResponse = (response: string, mood: string): EntryInsights => {
    try {
        // Prepend the { we used to prime the response
        let jsonStr = '{' + response;

        // Use brace counting to find the complete JSON object (handles nested braces)
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
            lesson: parsed.lesson || 'Reflection helps us grow.',
            moodAnalysis: parsed.moodAnalysis || parsed.mood || `Your mood today: ${mood}`,
            reflectionPrompt: parsed.reflectionPrompt || parsed.question || 'What will you carry forward?',
        };
    } catch (e) {
        console.warn('Failed to parse JSON response:', e);
        return {
            summary: 'Your entry has been recorded.',
            lesson: 'Taking time to reflect is valuable.',
            moodAnalysis: `You seem to be feeling ${mood}`,
            reflectionPrompt: 'What made you feel this way today?',
        };
    }
};
