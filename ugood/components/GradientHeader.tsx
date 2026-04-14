import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from '../utils/theme';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  gradient?: string[];
  style?: ViewStyle;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export default function GradientHeader({
  title,
  subtitle,
  gradient = [colors.light.background, colors.light.background], // Flat parchment bg
  style,
  showBack = false,
  rightElement,
}: GradientHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <LinearGradient
      colors={gradient as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 32 }, style]}
    >
      {showBack && (
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 16 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.light.text} />
        </TouchableOpacity>
      )}

      {rightElement && (
        <View style={[styles.rightElement, { top: insets.top + 16 }]}>
          {rightElement}
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    paddingBottom: 48,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.light.text, // Charcoal
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Playfair Display',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(61,61,61,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  rightElement: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
});

