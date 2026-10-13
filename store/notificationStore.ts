import { create } from 'zustand';
import { supabase } from '../services/supabase';

export type NotificationType = 'past_self' | 'system';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string | null;
    content: string;
    related_entry_id: string | null;
    read: boolean;
    created_at: string;
}

interface NotificationState {
    notifications: Notification[];
    loading: boolean;
    unreadCount: number;
    fetchNotifications: (userId: string) => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    addNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    loading: false,
    unreadCount: 0,

    fetchNotifications: async (userId: string) => {
        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                set({
                    notifications: data,
                    unreadCount: data.filter(n => !n.read).length,
                    loading: false
                });
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            set({ loading: false });
        }
    },

    markAsRead: async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (error) throw error;

            const updatedNotifications = get().notifications.map(n =>
                n.id === notificationId ? { ...n, read: true } : n
            );

            set({
                notifications: updatedNotifications,
                unreadCount: updatedNotifications.filter(n => !n.read).length
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },

    addNotification: async (notification) => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .insert(notification)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const currentNotifications = [data, ...get().notifications];
                set({
                    notifications: currentNotifications,
                    unreadCount: currentNotifications.filter(n => !n.read).length
                });
            }
        } catch (error) {
            console.error('Error adding notification:', error);
        }
    }
}));
