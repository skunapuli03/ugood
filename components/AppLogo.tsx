import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/theme';

interface AppLogoProps {
  scale?: number;
  animate?: boolean;
}

export default function AppLogo({ scale = 1, animate = true }: AppLogoProps) {
  const bloomPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bloomPulse, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bloomPulse, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animate]);

  const bloomPulseScale = bloomPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <View style={[styles.centerComposition, { transform: [{ scale }] }]}>
      {/* Ambient Radial Glow — light blue bloom */}
      <Animated.View
        style={[
          styles.bloomOuter,
          animate && { transform: [{ scale: bloomPulseScale }] },
        ]}
      />

      {/* Book Icon Frame */}
      <View style={styles.iconFrame}>
        {/* Soft bloom behind icon */}
        <View style={styles.iconBloom} />
        {/* Tilted paper frame */}
        <View style={styles.iconPaperFrame} />
        {/* Book icon */}
        <Ionicons
          name="book-outline"
          size={120}
          color={colors.light.primary}
          style={styles.bookIcon}
        />
        {/* Inner light source */}
        <View style={styles.innerLight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerComposition: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloomOuter: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(197, 235, 252, 0.2)', // Light blue bloom
  },
  iconFrame: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBloom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(226, 247, 225, 0.4)', // Pastel Mint bloom
  },
  iconPaperFrame: {
    position: 'absolute',
    width: 180,
    height: 180,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    transform: [{ rotate: '3deg' }],
  },
  bookIcon: {
    zIndex: 2,
  },
  innerLight: {
    position: 'absolute',
    bottom: 40,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.light.pastelYellow, // Cozy yellow light source
  },
});
