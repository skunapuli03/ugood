import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients } from '../utils/theme';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  gradient?: string[];
  style?: ViewStyle;
}

export default function GradientHeader({
  title,
  subtitle,
  gradient = gradients.primary,
  style,
}: GradientHeaderProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <LinearGradient
      colors={gradient as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 32 }, style]}
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    paddingBottom: 48,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 22,
  },
});

