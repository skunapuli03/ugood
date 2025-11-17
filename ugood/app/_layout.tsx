import { Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useUserStore } from "../store/userStore";

export default function RootLayout() {
  const { initialize } = useUserStore();

  useEffect(() => {
    initialize();
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
      </Stack>
    </SafeAreaProvider>
  );
}
