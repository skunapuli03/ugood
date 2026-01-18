import { Redirect } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { View, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { colors } from '../utils/theme';
import SplashScreen from '../components/SplashScreen';

export default function Index() {
  const { session, loading } = useUserStore();
  const [showSplash, setShowSplash] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Wait for both animation AND loading to complete before navigating
  const readyToNavigate = animationComplete && !loading;

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

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
});
