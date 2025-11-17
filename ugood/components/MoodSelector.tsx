import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, shadows } from '../utils/theme';

interface MoodSelectorProps {
  selectedMood: string;
  onSelect: (mood: string) => void;
}

const moods = ['😊', '😢', '😡', '😴', '😎', '🤔', '😌'];

export default function MoodSelector({ selectedMood, onSelect }: MoodSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>How are you feeling?</Text>
      <View style={styles.moodContainer}>
        {moods.map((mood) => (
          <TouchableOpacity
            key={mood}
            style={[
              styles.moodButton,
              selectedMood === mood && styles.moodButtonSelected,
            ]}
            onPress={() => onSelect(mood)}
            activeOpacity={0.7}
          >
            <Text style={styles.moodEmoji}>{mood}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 12,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  moodButtonSelected: {
    backgroundColor: colors.light.primaryLight,
    transform: [{ scale: 1.1 }],
    ...shadows.md,
  },
  moodEmoji: {
    fontSize: 32,
  },
});


