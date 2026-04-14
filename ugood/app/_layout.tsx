import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useUserStore } from "../store/userStore";
import { NotificationService } from "../services/NotificationService";
import { BackgroundService } from "../services/BackgroundService";
import * as Notifications from 'expo-notifications';
import { loadModel, isModelLoaded } from "../services/localLLM";

export default function RootLayout() {
  const { initialize } = useUserStore();
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    initialize();
    BackgroundService.register();

    // Preload the local LLM in the background to improve response times later
    const preloadAIModel = async () => {
      if (!isModelLoaded()) {
        try {
          console.log('App launch: preloading AI model...');
          await loadModel();
        } catch (e) {
          console.warn('Failed to preload AI model on launch:', e);
        }
      }
    };
    preloadAIModel();

    // Setup Local Notifications
    NotificationService.requestPermissions().then((granted) => {
      console.log('Notification permissions granted:', granted);
      if (granted) {
        NotificationService.scheduleMorningMirror();
        NotificationService.scheduleStreakSavior();
      }
    });

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const screen = response.notification.request.content.data?.screen;
      const params = response.notification.request.content.data?.params;

      if (screen) {
        if (params) {
          router.push({ pathname: screen as any, params: params as any });
        } else {
          router.push(screen as any);
        }
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="journal/emotions"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="journal/new"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="journal/edit/[id]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="journal/chat/[id]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
