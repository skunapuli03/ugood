import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { processEntryWithAI } from '../services/aiProcessor';

export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  title: string;
  mood: string;
  created_at: string;
  updated_at: string;
}

interface JournalState {
  entries: JournalEntry[];
  loading: boolean;
  error: string | null;
  fetchEntries: (userId: string) => Promise<void>;
  createEntry: (userId: string, title: string, content: string, mood: string) => Promise<JournalEntry | null>;
  updateEntry: (entryId: string, title: string, content: string, mood: string) => Promise<boolean>;
  deleteEntry: (entryId: string) => Promise<boolean>;
  getEntry: (entryId: string) => JournalEntry | null;
  clearEntries: () => void;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  loading: false,
  error: null,
  fetchEntries: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ entries: data || [], loading: false });
    } catch (error: any) {
      console.error('Error fetching entries:', error);
      set({ error: error.message, loading: false });
    }
  },
  createEntry: async (userId: string, title: string, content: string, mood: string) => {
    set({ loading: true, error: null });
    try {
      const entryData = {
        user_id: userId,
        title,
        content,
        mood,
      };

      console.log('Creating entry with data:', { userId, contentLength: content.length, mood });

      const { data, error } = await supabase
        .from('journals')
        .insert(entryData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Entry created successfully:', data?.id);

      // Process with AI in the background
      if (data) {
        processEntryWithAI(data.id, `${title}\n\n${content}`, mood, userId).catch((err) => {
          console.error('Error processing entry with AI:', err);
        });
      }

      // Add to local state
      set((state) => ({
        entries: [data, ...state.entries],
        loading: false,
      }));

      return data;
    } catch (error: any) {
      console.error('Error creating entry:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      set({ error: error.message, loading: false });
      return null;
    }
  },
  updateEntry: async (entryId: string, title: string, content: string, mood: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('journals')
        .update({
          title,
          content,
          mood,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;

      // Reprocess with AI
      const entry = get().entries.find((e) => e.id === entryId);
      if (data && entry) {
        processEntryWithAI(data.id, content, mood, entry.user_id).catch((err) => {
          console.error('Error reprocessing entry with AI:', err);
        });
      }

      // Update local state
      set((state) => ({
        entries: state.entries.map((e) => (e.id === entryId ? data : e)),
        loading: false,
      }));

      return true;
    } catch (error: any) {
      console.error('Error updating entry:', error);
      set({ error: error.message, loading: false });
      return false;
    }
  },
  deleteEntry: async (entryId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('journals')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      // Also delete associated insights
      await supabase
        .from('insights')
        .delete()
        .eq('entry_id', entryId);

      // Update local state
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== entryId),
        loading: false,
      }));

      return true;
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      set({ error: error.message, loading: false });
      return false;
    }
  },
  getEntry: (entryId: string) => {
    return get().entries.find((e) => e.id === entryId) || null;
  },
  clearEntries: () => set({ entries: [], loading: false, error: null }),
}));


