import { Redirect } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const { session, loading: authLoading } = useUserStore();
  const [onboardingStatus, setOnboardingStatus] = useState<'loading' | 'needs_onboarding' | 'complete'>('loading');

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const flag = await AsyncStorage.getItem('ai_onboarding_complete');
        if (flag !== 'true') {
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
