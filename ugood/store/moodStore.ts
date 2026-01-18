import { create } from 'zustand';
import { supabase } from '../services/supabase';

interface MoodEntry {
    id: string;
    user_id: string;
    emoji: string;
    created_at: string;
}

interface MoodState {
    lastMoodAt: number | null;
    frequency: number; // minutes
    loading: boolean;
    error: string | null;
    setFrequency: (minutes: number) => void;
    recordMood: (userId: string, emoji: string) => Promise<{ success: boolean; message?: string }>;
    fetchLastMoodTime: (userId: string) => Promise<void>;
}

export const useMoodStore = create<MoodState>((set, get) => ({
    lastMoodAt: null,
    frequency: 15, // Default 15 minutes
    loading: false,
    error: null,

    setFrequency: (minutes: number) => set({ frequency: minutes }),

    fetchLastMoodTime: async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('moods')
                .select('created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"

            if (data) {
                set({ lastMoodAt: new Date(data.created_at).getTime() });
            }
        } catch (error: any) {
            console.error('Error fetching last mood time:', error);
        }
    },

    recordMood: async (userId: string, emoji: string) => {
        const now = Date.now();
        let { lastMoodAt, frequency } = get();

        // If we haven't checked the DB yet, do one quick check
        if (lastMoodAt === null) {
            await get().fetchLastMoodTime(userId);
            lastMoodAt = get().lastMoodAt;
        }

        const THROTTLE_MS = frequency * 60 * 1000;
        if (lastMoodAt && now - lastMoodAt < THROTTLE_MS) {
            const secondsRemaining = Math.ceil((THROTTLE_MS - (now - lastMoodAt)) / 1000);
            const minutesRemaining = Math.ceil(secondsRemaining / 60);

            return {
                success: false,
                message: `Take a deep breath! You've already recorded your mood recently. We'll be ready for your next check-in in about ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}.`
            };
        }

        set({ loading: true, error: null });

        try {
            const { error } = await supabase
                .from('moods')
                .insert({
                    user_id: userId,
                    emoji,
                });

            if (error) throw error;

            set({ lastMoodAt: now, loading: false });
            return { success: true };
        } catch (error: any) {
            console.error('Error recording mood:', error);
            set({ error: error.message, loading: false });
            return { success: false, message: error.message };
        }
    },
}));
