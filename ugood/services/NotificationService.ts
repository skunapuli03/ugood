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
    }),
});

export const NotificationService = {
    /**
     * Request user permission for local push notifications
     */
    async requestPermissions() {
        let finalStatus;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Notification permissions not granted');
            return false;
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#c5ebfc',
            });
        }

        return true;
    },

    /**
     * Morning Mirror — 8:00 AM daily
     */
    async scheduleMorningMirror() {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;

        await Notifications.scheduleNotificationAsync({
            identifier: 'morning-mirror',
            content: {
                title: "Good morning ☀️",
                body: "How are you feeling? A quick check-in sets the tone for your whole day.",
                data: { screen: 'journal/emotions' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 8,
                minute: 0,
            },
        });
        console.log('Morning Mirror scheduled for 8:00 AM');
    },

    /**
     * Streak Savior — 9:00 PM daily
     */
    async scheduleStreakSavior() {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;

        await Notifications.scheduleNotificationAsync({
            identifier: 'streak-savior',
            content: {
                title: "Your streak is still alive 🌱",
                body: "Don't let today slip by — 60 seconds is all you need to keep going.",
                data: { screen: 'journal/new' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 21,
                minute: 0,
            },
        });
        console.log('Streak Savior scheduled for 9:00 PM');
    },

    /**
     * Schedule a one-time reminder after X minutes
     */
    async scheduleMoodReminder(minutes: number) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;

        await Notifications.cancelScheduledNotificationAsync('mood-reminder');

        if (minutes <= 0) return;

        const id = await Notifications.scheduleNotificationAsync({
            identifier: 'mood-reminder',
            content: {
                title: "Just checking in 🤍",
                body: "One minute. That's all it takes to talk to your future self.",
                data: { screen: '/(tabs)' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: Math.max(minutes * 60, 1),
                repeats: true,
            },
        });

        console.log(`Mood reminder scheduled! ID: ${id}, Delay: ${minutes}m`);
    },
};
