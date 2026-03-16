import { generate, loadModel, isModelLoaded } from './localLLM';
import { buildContext, formatContextPrompt } from './contextBuilder';
import { JournalEntry } from '../store/journalStore';

export interface EntryInsights {
    summary: string;
    lessons: string[]; // Changed from single lesson to array
    moodAnalysis: string;
    reflectionPrompt: string;
}

export interface PatternInsight {
    title: string;
    analysis: string;
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
        const hasPastContext = contextStr && contextStr !== 'No previous entries.';
        const safeEntryContent = entryContent.length > 1500
            ? entryContent.substring(0, 1500) + '...'
            : entryContent;

        const prompt = `<|im_start|>system
You are the wiser, realized version of me. Analyze my journal entries and provide supportive insights. Always respond with valid JSON only, no other text.<|im_end|>
<|im_start|>user
Analyze my latest journal entry and respond with JSON. Speak directly to me as if you are the realized self of my future, looking back at me now.

Entry: "${safeEntryContent}"
Mood: ${mood}
${hasPastContext ? `My past entries (for context on patterns):\n${contextStr}` : ''}

Respond with exactly this JSON structure:
{
  "summary": "1-2 sentences summarizing my entry",
  "lessons": ["List 3-5 distinct pieces of advice, warnings, or encouragements from my realized self to me right now"],
  "moodAnalysis": "1 sentence analyzing my emotional state",
  "reflectionPrompt": "A thoughtful question for me to consider"
}<|im_end|>
<|im_start|>assistant
{`;

        console.log('Generated prompt for LLM');
        const response = await generate(prompt);
        console.log('LLM raw response length:', response.length);
        console.log('LLM raw response preview:', response.substring(0, 500) + '...');

        return parseJsonResponse(response, mood);
    } catch (e: any) {
        console.error('generateInsights failed:', e);
        console.log("ts dont work")
        return {
            summary: 'Your reflection has been safely stored.',
            lessons: ['I am still processing my thoughts. Give me a moment to reflect.'], // Better fallback text that indicates processing
            moodAnalysis: `You recorded feeling ${mood}.`,
            reflectionPrompt: 'What is one thing we can do differently tomorrow?',
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
            lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [parsed.lesson || parsed.lessons || 'Reflection helps us grow.'],
            moodAnalysis: parsed.moodAnalysis || parsed.mood || `Your mood today: ${mood}`,
            reflectionPrompt: parsed.reflectionPrompt || parsed.question || 'What will you carry forward?',
        };
    } catch (e) {
        console.warn('Failed to parse JSON response:', e);

        // If it failed to parse, it likely got cut off. As a fallback, try to extract whatever text we can.
        const fallbackText = response.replace(/[{}"]/g, '').trim() || 'Reflection helps us grow.';

        return {
            summary: 'Your entry has been recorded.',
            lessons: [fallbackText.substring(0, 100) + '...'], // Give them a snippet of the raw output if it failed
            moodAnalysis: `You seem to be feeling ${mood}`,
            reflectionPrompt: 'What made you feel this way today?',
        };
    }
};

/**
 * Generate a holistic pattern analysis across multiple entries.
 */
export const generatePatternAnalysis = async (entries: JournalEntry[]): Promise<PatternInsight | null> => {
    if (entries.length < 3) return null; // Need some history to see patterns

    try {
        if (!isModelLoaded()) await loadModel();

        // Sort newest first, take 15, then reverse so AI reads them in order of occurrence
        const entriesSummary = [...entries]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 15) // Analyze last 15 entries max for context limits
            .reverse()
            .map(e => `- [${e.created_at.split('T')[0]}] Mood: ${e.mood}. Content: ${e.content}`)
            .join('\n');

        const prompt = `<|im_start|>system
You are the wiser, realized version of me. You see patterns in my life that I don't see yet. Respond with valid JSON only.<|im_end|>
<|im_start|>user
I am going to provide my last ${entries.length} journal entries. Analyze them for recurring patterns, emotional cycles, or growth. Speak to me directly as my future realized self.

Entries:
${entriesSummary}

Respond with exactly this JSON structure:
{
  "title": "A short, poetic title for this insight (e.g., 'The Tuesday Morning Blues' or 'Finding Strength in Silence')",
  "analysis": "2-3 sentences explaining the pattern you see and what I can learn from it or how I should handle it."
}<|im_end|>
<|im_start|>assistant
{`;

        const response = await generate(prompt);
        const jsonStr = '{' + response.split('}')[0] + '}'; // Simple parse for this specific case
        const parsed = JSON.parse(jsonStr);

        return {
            title: parsed.title || 'A Message from your Realized Self',
            analysis: parsed.analysis || 'I am watching your journey closely. Keep writing.'
        };
    } catch (e) {
        console.error('generatePatternAnalysis failed:', e);
        return null;
    }
};
