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

  // Priority 1: If user is logged in -> straight to Home
  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  // Priority 2: If user has already completed onboarding -> straight to Sign In
  if (onboardingStatus === 'complete') {
    return <Redirect href="/sign-in" />;
  }

  // Priority 3: Brand new user -> Welcome & Onboarding
  return <Redirect href="/onboarding" />;
}
