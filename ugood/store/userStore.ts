import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { getCurrentSession } from '../services/auth';

interface UserState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  clear: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setLoading: (loading) => set({ loading }),
  initialize: async () => {
    set({ loading: true });
    try {
      const { session, error } = await getCurrentSession();
      if (error) {
        console.error('Error initializing session:', error);
      }
      set({ session, user: session?.user ?? null, loading: false });
    } catch (error) {
      console.error('Error initializing user store:', error);
      set({ loading: false });
    }
  },
  clear: () => set({ user: null, session: null, loading: false }),
}));


