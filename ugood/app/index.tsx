import { Redirect } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { View, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../utils/theme';
import SplashScreen from '../components/SplashScreen';

export default function Index() {
  const { session, loading: authLoading } = useUserStore();
  const [showSplash, setShowSplash] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<'loading' | 'needs_onboarding' | 'complete'>('loading');

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const flag = await AsyncStorage.getItem('ai_onboarding_complete');
        // If flag is missing, user needs onboarding
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

  // Wait for auth, animation, AND onboarding check
  const readyToNavigate = animationComplete && !authLoading && onboardingStatus !== 'loading';

  const handleAnimationComplete = () => {
    setAnimationComplete(true);
  };

  // Hide splash when ready
  useEffect(() => {
    if (readyToNavigate) {
      setShowSplash(false);
    }
  }, [readyToNavigate]);

  // Show splash animation first
  if (showSplash) {
    return (
      <View style={styles.container}>
        <SplashScreen onAnimationComplete={handleAnimationComplete} />
      </View>
    );
  }

  // After splash, redirect based on auth state
  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  // If authenticated but AI setup isn't done, force onboarding
  if (onboardingStatus === 'needs_onboarding') {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
});
