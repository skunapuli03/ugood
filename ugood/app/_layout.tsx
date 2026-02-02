import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useUserStore } from "../store/userStore";
import { ModelSetup } from "../components/ModelSetup";
import { isModelDownloaded } from "../services/localLLM";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  // In your root layout component:                                       
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const { initialize } = useUserStore();

  useEffect(() => {
    isModelDownloaded().then(setModelReady);
  }, []);
    
  useEffect(() => {
    initialize();
  }, []);

  if (modelReady === null) {
    return (                                                              
      <View style={{ flex: 1, justifyContent: 'center', alignItems:       
  'center' }}>                                                            
        <ActivityIndicator size="large" />                                
      </View>                                                             
    );
  }

  if (modelReady === false) {
    return <ModelSetup onComplete={() => setModelReady(true)} />;
  }


  
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
