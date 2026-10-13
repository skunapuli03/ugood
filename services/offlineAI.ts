import { callGemini, ADAPTIVE_PAST_SELF_INSTRUCTIONS } from './geminiService';
import { buildContext, formatContextPrompt } from './contextBuilder';
import { JournalEntry } from '../store/journalStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getSystemPrompt = async (): Promise<string> => {
  try {
    const goal = await AsyncStorage.getItem('ugood_user_goal');
    if (goal) {
      return `${ADAPTIVE_PAST_SELF_INSTRUCTIONS}\n\nKeep in mind the user's primary goal is: [${goal}]. Calibrate your reflections to help them achieve this.`;
    }
  } catch (e) {
    console.warn('Failed to load user goal for AI prompt', e);
  }
  return ADAPTIVE_PAST_SELF_INSTRUCTIONS;
};

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

export interface MoodTrendTip {
  mood: string;
  tip: string;
}

export interface DynamicForYouCard {
  title: string;
  topic: 'stress' | 'growth' | 'reflection' | 'energy';
}

// ── Google Interactions API Structured Output Schemas ──
const insightsSchema = {
  type: "object",
  properties: {
    summary: { type: "string", description: "1-2 sentences summarizing the core theme or struggle in the entry" },
    lessons: {
      type: "array",
      items: { type: "string" },
      description: "3-4 distinct pieces of honest advice, perspective checks, or wake-up calls from their wiser past self"
    },
    moodAnalysis: { type: "string", description: "1-2 sentences analyzing their emotional state and pattern alignment" },
    reflectionPrompt: { type: "string", description: "A single, targeted question for the user to break the cycle or reflect honestly" }
  },
  required: ["summary", "lessons", "moodAnalysis", "reflectionPrompt"]
};

const patternSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "A short, direct pattern title like 'Late Night Overthinking Loop'" },
    analysis: { type: "string", description: "2-3 sentences explaining the pattern and the lesson for their future self" }
  },
  required: ["title", "analysis"]
};

/**
 * Generate AI insights for a journal entry using Gemini.
 */
export const generateInsights = async (
  entryContent: string,
  mood: string,
  pastEntries: JournalEntry[]
): Promise<EntryInsights> => {
  try {
    const relevantEntries = buildContext(entryContent, mood, pastEntries);
    const contextStr = formatContextPrompt(relevantEntries);
    const hasPastContext = contextStr && contextStr !== 'No previous entries.';
    const safeEntryContent = entryContent.length > 2000
      ? entryContent.substring(0, 2000) + '...'
      : entryContent;

    const systemPrompt = await getSystemPrompt();

    const prompt = `Analyze this journal entry and determine the right tone mode (Self-Sabotage/Tough Love, Genuine Grief/Solidarity, Self-Blame/Perspective, or Growth/Reinforcement).

Current Entry: "${safeEntryContent}"
Mood: ${mood}
${hasPastContext ? `Past entries (for pattern detection):\n${contextStr}` : ''}`;

    const response = await callGemini(prompt, { 
      systemInstruction: systemPrompt,
      schema: insightsSchema,
    });
    return parseInsightsJson(response, mood);
  } catch (e) {
    console.warn('generateInsights fallback used:', e);
    return {
      summary: 'Your thoughts have been securely recorded.',
      lessons: [
        'Notice the patterns that lead to moments like this.',
        'Give yourself space to process before reacting.',
        'Action creates clarity where overthinking creates doubt.'
      ],
      moodAnalysis: `You entered this reflection feeling ${mood}. Take a moment to check in with yourself.`,
      reflectionPrompt: 'What is one small choice you can make today to support your future self?'
    };
  }
};

const parseInsightsJson = (response: string, mood: string): EntryInsights => {
  try {
    const cleaned = response.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary || 'Your entry has been recorded.',
      lessons: Array.isArray(parsed.lessons) && parsed.lessons.length > 0
        ? parsed.lessons
        : [parsed.lesson || 'Growth begins when you recognize the pattern.'],
      moodAnalysis: parsed.moodAnalysis || `Logged mood: ${mood}`,
      reflectionPrompt: parsed.reflectionPrompt || 'What is the one thing you need to focus on next?'
    };
  } catch (err) {
    console.error('Failed to parse Gemini insights JSON:', err);
    return {
      summary: 'Your entry has been recorded.',
      lessons: ['Look closely at what triggered this feeling today.'],
      moodAnalysis: `Mood tracked: ${mood}`,
      reflectionPrompt: 'What will you do differently next time?'
    };
  }
};

/**
 * Generate a holistic pattern analysis across recent entries using Gemini.
 */
export const generatePatternAnalysis = async (
  entries: JournalEntry[],
  trendingMoods?: string
): Promise<PatternInsight | null> => {
  if (entries.length < 3) return null;

  try {
    const entriesSummary = [...entries]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
      .reverse()
      .map(e => `- [${e.created_at.split('T')[0]}] Mood: ${e.mood}. Content: ${e.content.slice(0, 200)}`)
      .join('\n');

    const moodContext = trendingMoods ? `\nTrending moods: ${trendingMoods}` : '';
    const systemPrompt = await getSystemPrompt();

    const prompt = `Analyze these recent entries for recurring behavioral loops, emotional roadblocks, or noticeable progress.${moodContext}

Entries:
${entriesSummary}`;

    const response = await callGemini(prompt, { 
      systemInstruction: systemPrompt,
      schema: patternSchema,
    });
    const cleaned = response.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      title: parsed.title || 'Observed Pattern',
      analysis: parsed.analysis || 'Keep journaling to unlock deeper pattern analysis.'
    };
  } catch (e) {
    console.error('generatePatternAnalysis failed:', e);
    return null;
  }
};

/**
 * Generate curated tips based on trending moods.
 */
export const generateMoodTrendTips = async (
  trendingMoods: { label: string; percentage: number }[],
  associatedEntries: JournalEntry[]
): Promise<MoodTrendTip[]> => {
  if (trendingMoods.length === 0) return [];

  try {
    const moodSummary = trendingMoods.map(m => `${m.label} (${m.percentage}%)`).join(', ');
    const entriesContext = associatedEntries
      .slice(0, 6)
      .map(e => `- Mood: ${e.mood}. Entry: ${e.content.slice(0, 150)}`)
      .join('\n');

    const systemPrompt = await getSystemPrompt();

    const prompt = `The user's trending moods are: ${moodSummary}

Recent journal excerpts:
${entriesContext}

Explain why these moods recur and provide actionable advice.
Respond with strictly this JSON structure:
{
  "tips": [
    { "mood": "mood_name", "tip": "1-2 sentences: a direct, honest realization addressing the user as 'you'" }
  ]
}`;

    const response = await callGemini(prompt, { systemInstruction: systemPrompt });
    const cleaned = response.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.tips && Array.isArray(parsed.tips)) {
      return parsed.tips.slice(0, 3);
    }
    return [];
  } catch (e) {
    console.error('generateMoodTrendTips failed:', e);
    return [];
  }
};

/**
 * Generate a single AI observation based on last entries.
 */
export const generatePatternObservation = async (entries: JournalEntry[]): Promise<string> => {
  const recentEntries = entries.slice(0, 6);
  if (recentEntries.length === 0) {
    return 'Keep journaling! A few more entries will reveal your recurring patterns.';
  }

  try {
    const contextStr = recentEntries
      .map(e => `[${new Date(e.created_at).toLocaleDateString()}] Mood: ${e.mood || 'Unspecified'}\nEntry: ${e.content.slice(0, 200)}`)
      .join('\n\n');

    const systemPrompt = await getSystemPrompt();
    const prompt = `Based on these recent entries, give ONE sharp observation or encouragement (under 2 sentences) addressing the user as 'You':\n\n${contextStr}`;

    const response = await callGemini(prompt, { systemInstruction: systemPrompt });
    return response.trim() || 'Notice what drained you today versus what gave you energy.';
  } catch (error) {
    return 'Notice the difference between what you can control and what you cannot.';
  }
};

/**
 * Generate 2 personalized "For You" card topics.
 */
export const generateForYouCards = async (entries: any[]): Promise<DynamicForYouCard[] | null> => {
  if (entries.length === 0) return null;

  try {
    const recentEntriesStr = entries.slice(0, 6).map((e: any) => `Mood: ${e.mood}. Content: ${e.content.slice(0, 100)}`).join('\n');
    const prompt = `Suggest 2 personalized wellness card titles based on these entries:
${recentEntriesStr}

Respond with strictly this JSON:
{ "cards": [ { "title": "string (max 4 words)", "topic": "stress" | "growth" | "reflection" | "energy" } ] }`;

    const response = await callGemini(prompt);
    const cleaned = response.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed?.cards && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
      return parsed.cards.slice(0, 2);
    }
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Generate a specific strategy/tip for a given mood.
 */
export const generateMoodStrategy = async (mood: string, entries: JournalEntry[]): Promise<string> => {
  try {
    const recentContext = entries.slice(0, 5).map(e => `- ${e.mood}: ${e.content.slice(0, 100)}`).join('\n');
    const systemPrompt = await getSystemPrompt();

    const prompt = `The user is feeling: "${mood}".
Recent context:
${recentContext}

Give ONE clear, direct realization (under 2 sentences) on how to handle this state without falling into past traps. Address them as 'You'.`;

    const response = await callGemini(prompt, { systemInstruction: systemPrompt });
    return response.trim() || `Remember you have navigated feeling ${mood} before. Take a breath and focus on what is right in front of you.`;
  } catch (e) {
    return `As you navigate being ${mood}, focus on the one small thing you can control right now.`;
  }
};
