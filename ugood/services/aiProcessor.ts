import { generateInsights } from './gemini';
import { supabase } from './supabase';

export interface EntryInsights {
  summary: string;
  lesson: string;
  moodAnalysis: string;
  reflectionPrompt: string;
}

export const processEntryWithAI = async (
  entryId: string,
  content: string,
  mood: string,
  userId: string
): Promise<EntryInsights> => {
  try {
    // Generate insights using Gemini
    const insights = await generateInsights(content, mood);

    // Save insights to Supabase
    const { error } = await supabase
      .from('insights')
      .upsert({
        entry_id: entryId,
        user_id: userId,
        summary: insights.summary,
        lesson: insights.lesson,
        mood_analysis: insights.moodAnalysis,
        reflection_prompt: insights.reflectionPrompt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'entry_id',
      });

    if (error) {
      console.error('Error saving insights:', error);
      // Still return insights even if save fails
    }

    return insights;
  } catch (error: any) {
    console.error('Error processing entry with AI:', error);
    throw error;
  }
};

export const getEntryInsights = async (entryId: string): Promise<EntryInsights | null> => {
  try {
    const { data, error } = await supabase
      .from('insights')
      .select('*')
      .eq('entry_id', entryId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      summary: data.summary || '',
      lesson: data.lesson || '',
      moodAnalysis: data.mood_analysis || '',
      reflectionPrompt: data.reflection_prompt || '',
    };
  } catch (error: any) {
    console.error('Error fetching insights:', error);
    return null;
  }
};


