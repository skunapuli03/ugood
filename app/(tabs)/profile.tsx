import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useJournalStore } from '../../store/journalStore';
import { useMoodStore } from '../../store/moodStore';
import { signOut } from '../../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from '../../services/NotificationService';
import { useNotificationStore } from '../../store/notificationStore';
import { colors, borderRadius, shadows } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Simple heatmap cell colors based on intensity
const heatmapColors = [
  'rgba(61,61,61,0.05)',   // empty
  '#E2F7E1',               // low — pastel mint
  '#FFF9C4',               // medium — pastel yellow
  '#FFE0B2',               // high — pastel orange
  '#B8A1D1',               // very high — lavender
];

export default function InsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, clear } = useUserStore();
  const { entries } = useJournalStore();
  const { frequency, setFrequency } = useMoodStore();
  const [loading, setLoading] = useState(false);
  const { notifications } = useNotificationStore();

  const patternHistory = useMemo(() => {
    return notifications.filter(n => n.type === 'past_self');
  }, [notifications]);

  // Generate real consecutive day streak
  const userStreak = useMemo(() => {
    if (entries.length === 0) return 0;

    const dates = [...new Set(entries.map((e: any) => new Date(e.created_at).toISOString().split('T')[0]))];
    dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
      return 0; // broken streak
    }

    let currentStreak = 1;
    let expectedDate = new Date(dates[0]);
    expectedDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < dates.length; i++) {
      expectedDate.setDate(expectedDate.getDate() - 1);
      const expectedStr = expectedDate.toISOString().split('T')[0];
      if (dates[i] === expectedStr) {
        currentStreak++;
      } else {
        break;
      }
    }
    return currentStreak;
  }, [entries]);

  // Generate real heatmap data (last 6 days) based on entry timestamps
  const heatmapData = useMemo(() => {
    const data: number[] = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const targetStr = targetDate.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

      const entriesThatDay = entries.filter((e: any) => {
        const entryDate = new Date(e.created_at).toLocaleDateString('en-CA');
        return entryDate === targetStr;
      }).length;

      let intensity = 0;
      if (entriesThatDay === 0) intensity = 0;
      else if (entriesThatDay === 1) intensity = 1;
      else if (entriesThatDay === 2) intensity = 2;
      else if (entriesThatDay === 3) intensity = 3;
      else intensity = 4;

      data.push(intensity);
    }
    return data;
  }, [entries]);

  // Mood distribution donut segments based on actual primary selected emotions
  const moodStats = useMemo(() => {
    if (entries.length === 0) return [];

    const moodCounts: Record<string, number> = {};
    entries.forEach((e: any) => {
      const m = e.mood ? e.mood.split(',')[0].trim() : 'Unknown';
      moodCounts[m] = (moodCounts[m] || 0) + 1;
    });

    const total = entries.length;
    let stats = Object.entries(moodCounts).map(([label, count]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value: Math.round((count / total) * 100),
    }));

    stats.sort((a, b) => b.value - a.value);
    stats = stats.slice(0, 3);

    const themeColors = ['#E2F7E1', '#FFF9C4', '#E1F5FE'];
    return stats.map((s, i) => ({ ...s, color: themeColors[i] }));
  }, [entries]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await signOut();
            clear();
            router.replace('/sign-in');
          } catch (error: any) {
            Alert.alert('Error', error.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.title}>Insights</Text>
      <Text style={styles.subtitle}>YOUR MOOD PATTERNS</Text>



      {/* Mood Distribution Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Mood Distribution</Text>
            <Text style={styles.cardLabel}>THIS MONTH</Text>
          </View>
          <View style={[styles.cardIconBadge, { backgroundColor: colors.light.pastelBlue }]}>
            <Ionicons name="pie-chart-outline" size={20} color="#3B82F6" />
          </View>
        </View>

        {/* Simplified donut as bar segments */}
        <View style={styles.donutBar}>
          {moodStats.map((stat, index) => (
            <View
              key={index}
              style={[
                styles.donutSegment,
                {
                  flex: stat.value,
                  backgroundColor: stat.color,
                  borderTopLeftRadius: index === 0 ? 12 : 0,
                  borderBottomLeftRadius: index === 0 ? 12 : 0,
                  borderTopRightRadius: index === moodStats.length - 1 ? 12 : 0,
                  borderBottomRightRadius: index === moodStats.length - 1 ? 12 : 0,
                },
              ]}
            />
          ))}
        </View>

        {/* Mood Labels */}
        <View style={styles.moodLabels}>
          {moodStats.map((stat, index) => (
            <View key={index} style={styles.moodLabel}>
              <View style={[styles.moodLabelDot, { backgroundColor: stat.color }]} />
              <Text style={styles.moodLabelText}>{stat.label}</Text>
              <Text style={styles.moodLabelValue}>{stat.value}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recurring Pattern Section */}
      <View style={{ marginBottom: 32 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(61,61,61,0.5)', letterSpacing: 2 }}>PAST PATTERNS</Text>
          {patternHistory.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/journal/patterns' as any)}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(61,61,61,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {patternHistory.length > 0 ? (
          <View style={[styles.card, { backgroundColor: 'rgba(184,161,209,0.15)', marginBottom: 0 }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Latest Pattern</Text>
                <Text style={styles.cardLabel}>
                  {new Date(patternHistory[0].created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              <View style={[styles.cardIconBadge, { backgroundColor: 'rgba(184,161,209,0.2)' }]}>
                <Ionicons name="sparkles-outline" size={20} color={colors.light.accent} />
              </View>
            </View>
            <Text style={styles.aiInsightText}>
              {patternHistory[0].content}
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: 'rgba(184,161,209,0.1)', marginBottom: 0 }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>No Patterns Yet</Text>
                <Text style={styles.cardLabel}>BASED ON YOUR ENTRIES</Text>
              </View>
              <View style={[styles.cardIconBadge, { backgroundColor: 'rgba(184,161,209,0.15)' }]}>
                <Ionicons name="sparkles-outline" size={20} color={colors.light.accent} />
              </View>
            </View>
            <Text style={styles.aiInsightText}>
              Keep journaling! I need a few entries to start identifying patterns.
            </Text>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.light.pastelBlue }]}>
          <Text style={styles.statNumber}>{entries.length}</Text>
          <Text style={styles.statDesc}>Total Entries</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.light.pastelMint }]}>
          <Text style={styles.statNumber}>
            {userStreak}
          </Text>
          <Text style={styles.statDesc}>Day Streak</Text>
        </View>
      </View>

      {/* Mood Check-in Frequency */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Check-in Frequency</Text>
        <View style={styles.frequencyOptions}>
          {[15, 30, 60, 120].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.frequencyBtn,
                frequency === mins && styles.frequencyBtnActive,
              ]}
              onPress={() => {
                setFrequency(mins);
                NotificationService.scheduleMoodReminder(mins);
              }}
            >
              <Text
                style={[
                  styles.frequencyBtnText,
                  frequency === mins && styles.frequencyBtnTextActive,
                ]}
              >
                {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={handleLogout}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.signOutText}>Sign Out</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.versionText}>Version 2.4.1 (Stable)</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.5)',
    letterSpacing: 2,
    marginBottom: 32,
  },

  // Cards
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: borderRadius.xxl,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.5)',
    letterSpacing: 2,
  },
  cardIconBadge: {
    padding: 10,
    backgroundColor: 'rgba(184,161,209,0.1)',
    borderRadius: borderRadius.lg,
  },

  // Heatmap
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },
  heatmapCell: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 6,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: 'rgba(61,61,61,0.4)',
    fontWeight: '500',
  },

  // Donut Bar
  donutBar: {
    flexDirection: 'row',
    height: 24,
    gap: 2,
    marginBottom: 16,
  },
  donutSegment: {
    height: '100%',
  },
  moodLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moodLabelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodLabelText: {
    fontSize: 12,
    color: 'rgba(61,61,61,0.6)',
    fontWeight: '500',
  },
  moodLabelValue: {
    fontSize: 12,
    color: colors.light.text,
    fontWeight: '700',
  },

  // AI Insight
  aiInsightText: {
    fontSize: 15,
    color: 'rgba(61,61,61,0.8)',
    lineHeight: 24,
    fontStyle: 'italic',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 24,
    borderRadius: borderRadius.xxl,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.light.text,
    marginBottom: 4,
  },
  statDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(61,61,61,0.6)',
  },

  // Frequency
  frequencyOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  frequencyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  frequencyBtnActive: {
    backgroundColor: colors.light.accent,
    borderColor: colors.light.accent,
  },
  frequencyBtnText: {
    fontSize: 14,
    color: 'rgba(61,61,61,0.5)',
    fontWeight: '600',
  },
  frequencyBtnTextActive: {
    color: '#FFFFFF',
  },

  // Sign Out
  signOutBtn: {
    backgroundColor: colors.light.text,
    paddingVertical: 18,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
    marginTop: 12,
    marginBottom: 12,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.4)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
});
