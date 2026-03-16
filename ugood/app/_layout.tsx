import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useUserStore } from "../store/userStore";
import { NotificationService } from "../services/NotificationService";
import * as Notifications from 'expo-notifications';

export default function RootLayout() {
  const { initialize } = useUserStore();
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    initialize();

    // Setup Local Notifications
    NotificationService.requestPermissions().then((granted) => {
      console.log('Notification permissions granted:', granted);
      if (granted) {
        NotificationService.scheduleDailyCheckIn();
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
          name="inbox"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
