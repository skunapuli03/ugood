import { Redirect } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isModelDownloaded } from '../services/localLLM';

export default function Index() {
  const { session, loading: authLoading } = useUserStore();
  const [onboardingStatus, setOnboardingStatus] = useState<'loading' | 'needs_onboarding' | 'complete'>('loading');

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const flag = await AsyncStorage.getItem('ai_onboarding_complete');
        const modelPresent = await isModelDownloaded();
        
        // If flag is missing OR model is missing, we treat as fresh install
        if (flag !== 'true' || !modelPresent) {
          setOnboardingStatus('needs_onboarding');
        } else {
          setOnboardingStatus('complete');
        }
      } catch (e) {
        setOnboardingStatus('needs_onboarding');
      }
    };
    checkOnboarding();
  }, []);

  // Wait for auth and onboarding check
  if (authLoading || onboardingStatus === 'loading') {
    return null; // The Global Splash in _layout handles the UI
  }

  // After check, redirect based on state
  if (onboardingStatus === 'needs_onboarding') {
    return <Redirect href="/onboarding" />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href="/(tabs)" />;
}
