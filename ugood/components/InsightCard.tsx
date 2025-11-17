import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, shadows, gradients } from '../utils/theme';

interface InsightCardProps {
  title: string;
  content: string;
  gradient?: string[];
}

export default function InsightCard({
  title,
  content,
  gradient = gradients.secondary,
}: InsightCardProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.content}>{content}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  gradient: {
    padding: 20,
    borderRadius: borderRadius.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  content: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    opacity: 0.95,
  },
});


