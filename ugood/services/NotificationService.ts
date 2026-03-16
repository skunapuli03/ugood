import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should appear when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
    }),
});

export const NotificationService = {
    /**
     * Request user permission for local push notifications
     */
    async requestPermissions() {
        let finalStatus;

        // Check existing permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        finalStatus = existingStatus;

        // Ask if not already granted
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Notification permissions not granted');
            return false;
        }

        // Android 8+ requires a channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#6366f1', // matches our primary theme color
            });
        }

        return true;
    },

    /**
     * Schedule a daily 8:00 PM mood check-in
     */
    async scheduleDailyCheckIn() {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;

        // Schedule the daily reminder (8 PM)
        // Note: We use a specific identifier logic if we want to update it, 
        // but for simplicity we'll just schedule it. 
        // In a real app, we might want to check the list of scheduled ones first.
        await Notifications.scheduleNotificationAsync({
            identifier: 'daily-checkin',
            content: {
                title: "Take a breath. 🌿",
                body: "Your private space is ready. How are you feeling today?",
                data: { screen: 'journal/new' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 20,
                minute: 0,
            },
        });

        console.log('Daily check-in scheduled for 8:00 PM');
    },

    /**
     * Schedule a one-time reminder after X minutes
     */
    async scheduleMoodReminder(minutes: number) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;

        // Cancel any existing dynamic reminder to avoid duplicates
        await Notifications.cancelScheduledNotificationAsync('mood-reminder');

        if (minutes <= 0) return;

        const id = await Notifications.scheduleNotificationAsync({
            identifier: 'mood-reminder',
            content: {
                title: "Checking in... 🍃",
                body: "It's time for your scheduled mood check-in. How are things going?",
                data: { screen: '/(tabs)' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: Math.max(minutes * 60, 1), // Ensure at least 1s
                repeats: false,
            },
        });

        console.log(`Mood reminder scheduled! ID: ${id}, Delay: ${minutes}m`);
    },
};
