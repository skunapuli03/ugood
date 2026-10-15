import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View, AppState, AppStateStatus, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useUserStore } from "../store/userStore";
import { NotificationService } from "../services/NotificationService";
import { BackgroundService } from "../services/BackgroundService";
import * as Notifications from 'expo-notifications';
import SplashScreen from "../components/SplashScreen";
import { colors } from "../utils/theme";

export default function RootLayout() {
  const { initialize } = useUserStore();
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription | null>(null);
  
  // Custom Splash Screen States
  const [showGlobalSplash, setShowGlobalSplash] = useState(true);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // 1. Initial State Sync
    initialize();
    BackgroundService.register();

    // 2. AppState Listener - only log state changes, do not re-overlay splash on active
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      appState.current = nextAppState;
    });

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
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
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
        
        {/* Absolute Splash Overlay */}
        {showGlobalSplash && (
          <View style={styles.splashOverlay}>
            <SplashScreen onAnimationComplete={() => setShowGlobalSplash(false)} />
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: colors.light.background,
  },
});
