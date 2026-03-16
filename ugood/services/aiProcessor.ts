import { generateInsights } from './offlineAI';
import { supabase } from './supabase';
import { JournalEntry } from '../store/journalStore';

export interface EntryInsights {
  summary: string;
  lessons: string[]; // Changed to array
  moodAnalysis: string;
  reflectionPrompt: string;
}

export const processEntryWithAI = async (
  entryId: string,
  content: string,
  mood: string,
  userId: string,
  pastEntries: JournalEntry[]
): Promise<EntryInsights> => {
  try {
    // Generate insights using local LLM with past context              
    console.log(`processEntryWithAI: Generating insights for entry ${entryId}...`);
    const insights = await generateInsights(content, mood, pastEntries);
    console.log(`processEntryWithAI: Insights generated. Saving to Supabase for user ${userId}...`);

    // Save insights to Supabase (unchanged)                            
    const { error } = await supabase
      .from('insights')
      .upsert({
        entry_id: entryId,
        user_id: userId,
        summary: insights.summary,
        lesson: insights.lessons.join('\n\n'), // Save as double-newline separated block
        mood_analysis: insights.moodAnalysis,
        reflection_prompt: insights.reflectionPrompt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'entry_id',
      });

    if (error) {
      console.error('processEntryWithAI: Error saving insights to Supabase:', error);
    } else {
      console.log('processEntryWithAI: Insights saved successfully.');
    }

    return insights;
  } catch (error: any) {
    console.error('processEntryWithAI: Critical error processing entry with AI:', error);
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
      lessons: (data.lesson || '').split('\n\n').filter(Boolean), // Split back into array
      moodAnalysis: data.mood_analysis || '',
      reflectionPrompt: data.reflection_prompt || '',
    };
  } catch (error: any) {
    console.error('Error fetching insights:', error);
    return null;
  }
};


