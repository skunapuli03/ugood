import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../utils/theme';

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
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bloomPulse, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animate]);

  const bloomPulseScale = bloomPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  return (
    <View style={[styles.centerComposition, { transform: [{ scale }] }]}>
      {/* Ambient Radial Breathing Glow */}
      <Animated.View
        style={[
          styles.bloomOuter,
          animate && { transform: [{ scale: bloomPulseScale }] },
        ]}
      />

      {/* Tactile Journal Cover */}
      <View style={styles.journalCover}>
        {/* Ribbon Bookmark protruding from top */}
        <View style={styles.ribbonBookmark} />

        {/* Left Spine Binding */}
        <View style={styles.journalSpine} />

        {/* Delicate inner margin guide line */}
        <View style={styles.spineStitchLine} />

        {/* Center Lavender Wax Seal */}
        <View style={styles.waxSealOuter}>
          <View style={styles.waxSealInner}>
            {/* Reassurance Stamp: Thumbs Up */}
            <Ionicons
              name="thumbs-up"
              size={34}
              color="#FFFFFF"
              style={styles.thumbsUpIcon}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerComposition: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
    height: 240,
  },
  bloomOuter: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(184, 161, 209, 0.18)', // Lavender ambient glow
  },
  journalCover: {
    width: 145,
    height: 180,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(61, 61, 61, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...shadows.lg,
  },
  ribbonBookmark: {
    position: 'absolute',
    top: -8,
    right: 28,
    width: 13,
    height: 24,
    backgroundColor: colors.light.accent,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    zIndex: 4,
    ...shadows.sm,
  },
  journalSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 15,
    backgroundColor: 'rgba(61, 61, 61, 0.04)',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderRightWidth: 1,
    borderRightColor: 'rgba(61, 61, 61, 0.07)',
  },
  spineStitchLine: {
    position: 'absolute',
    left: 18,
    top: 14,
    bottom: 14,
    width: 1,
    backgroundColor: 'rgba(61, 61, 61, 0.04)',
  },
  waxSealOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.light.accent, // #B8A1D1
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...shadows.md,
  },
  waxSealInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#AF96CB', // slightly deeper tone for pressed wax impression
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  thumbsUpIcon: {
    marginTop: -2,
    marginLeft: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
