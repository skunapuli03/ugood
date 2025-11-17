import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCalendarDate, parseISO } from 'date-fns';
import { colors, gradients, borderRadius, shadows } from '../utils/theme';
import { JournalEntry } from '../store/journalStore';

interface StreakDisplayProps {
  entries: JournalEntry[];
}

export default function StreakDisplay({ entries }: StreakDisplayProps) {
  const streak = useMemo(() => {
    if (entries.length === 0) return 0;

    const today = formatCalendarDate(new Date().toISOString());
    const entryDates = new Set(
      entries.map((e) => formatCalendarDate(e.created_at))
    );

    let currentStreak = 0;
    let checkDate = new Date();

    // Check if today has an entry
    const todayStr = formatCalendarDate(checkDate.toISOString());
    if (!entryDates.has(todayStr)) {
      // If today doesn't have an entry, check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive days with entries
    while (true) {
      const dateStr = formatCalendarDate(checkDate.toISOString());
      if (entryDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return currentStreak;
  }, [entries]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.warm}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.label}>🔥 Current Streak</Text>
        <Text style={styles.streak}>{streak}</Text>
        <Text style={styles.unit}>day{streak !== 1 ? 's' : ''}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  gradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
    fontWeight: '600',
  },
  streak: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  unit: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
});


