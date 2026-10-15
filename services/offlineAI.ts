import { callGemini, ADAPTIVE_PAST_SELF_INSTRUCTIONS } from './geminiService';
import { buildContext, formatContextPrompt } from './contextBuilder';
import { JournalEntry } from '../store/journalStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getSystemPrompt = async (): Promise<string> => {
  let prompt = ADAPTIVE_PAST_SELF_INSTRUCTIONS;
  try {
    const tone = await AsyncStorage.getItem('ugood_reflection_tone');
    if (tone === 'gentle') {
      prompt += `\n\nTONE PREFERENCE (GENTLE & VALIDATING): Speak with warm empathy and gentle validation. Focus on self-compassion, reminding them they are doing their best and validating difficult feelings without pressure.`;
    } else if (tone === 'direct') {
      prompt += `\n\nTONE PREFERENCE (DIRECT & ACTION-ORIENTED): Speak with direct clarity and practical focus. Highlight agency, concrete next steps, and personal accountability without fluff.`;
    } else {
      prompt += `\n\nTONE PREFERENCE (GROUNDED CLARITY): Speak with quiet, profound wisdom. Cut through overthinking and mental fog with calm, concise clarity.`;
    }

    const goal = await AsyncStorage.getItem('ugood_user_goal');
    if (goal) {
      prompt += `\n\nKeep in mind the user's primary goal is: [${goal}]. Calibrate your reflections to help them achieve this.`;
    }
  } catch (e) {
    console.warn('Failed to load user goal or tone for AI prompt', e);
  }
  return prompt;
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
    summary: { type: "string", description: "1 sentence summarizing the core theme or emotional state in the entry" },
    lessons: {
      type: "array",
      items: { type: "string" },
      description: "Exactly ONE single, laser-sharp, grounded sentence from their wiser past self that cuts through the noise and addresses the core dilemma."
    },
    moodAnalysis: { type: "string", description: "1 sentence analyzing their emotional state" },
    reflectionPrompt: { type: "string", description: "A single, targeted question for the user to reflect honestly" }
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

    const prompt = `Read this journal entry and deliver a brief, specific lesson (2 to 3 sentences) from their wiser past self.
Directly address the specific details, dilemma, or feeling described in their entry. Avoid generic one-liners, fortune-cookie cliches, or abstract platitudes. Make it grounded, brief, and specific to what they experienced.

Current Entry: "${safeEntryContent}"
Mood: ${mood}
${hasPastContext ? `Past entries (for pattern context):\n${contextStr}` : ''}`;

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
        'Notice what is taking your energy right now, and let go of what was never yours to carry.'
      ],
      moodAnalysis: `You entered this reflection feeling ${mood}.`,
      reflectionPrompt: 'What is one choice you can make right now to support yourself today?'
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

Give ONE clear, direct realization (under 2 sentences) on how to handle this state without falling into past traps. Address them as 'You'. Output plain text only, no JSON formatting.`;

    const response = await callGemini(prompt, { systemInstruction: systemPrompt });
    let text = response.trim();

    // If Gemini still returned JSON, extract the text value
    if (text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        text = parsed.realization || parsed.strategy || parsed.tip || parsed.insight || parsed.message || Object.values(parsed)[0] || text;
      } catch {}
    }

    if (typeof text === 'string') {
      text = text.replace(/^["']|["']$/g, '').trim();
    }

    return text || `Remember you have navigated feeling ${mood} before. Take a breath and focus on what is right in front of you.`;
  } catch (e) {
    return `As you navigate being ${mood}, focus on the one small thing you can control right now.`;
  }
};
