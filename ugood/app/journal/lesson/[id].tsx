import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getEntryInsights, processEntryWithAI } from '../../../services/aiProcessor';
import { useJournalStore } from '../../../store/journalStore';
import { supabase } from '../../../services/supabase';
import { colors, borderRadius, spacing } from '../../../utils/theme';
import { formatDateTime } from '../../../utils/format';

interface InsightData {
  lessons?: string[];
  reflection?: string;
  created_at?: string;
}

export default function LessonViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [journalDate, setJournalDate] = useState<string | null>(null);
  const [noInsight, setNoInsight] = useState(false);
  const spinValue = new Animated.Value(0);

  useEffect(() => {
    if (loading || generating) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [loading, generating]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      // 1. Fetch Entry Date
      const { data: journalData } = await supabase
        .from('journals')
        .select('created_at')
        .eq('id', id)
        .single();

      if (journalData) {
        setJournalDate(journalData.created_at);
      }

      // 2. Check for existing insights
      const data = await getEntryInsights(id as string);

      if (data) {
        setInsight(data);
      } else {
        // No insight exists yet — show the "Let Me Reflect" button
        setNoInsight(true);
      }
    } catch (err) {
      console.error('Error loading lesson:', err);
      setNoInsight(true);
    } finally {
      setLoading(false);
    }
  };

  // P1 Priority Interrupt: Generate lesson immediately
  const handleGenerateNow = async () => {
    if (!id) return;
    setGenerating(true);
    setNoInsight(false);

    try {
      let entry = useJournalStore.getState().getEntry(id as string);
      if (!entry) {
        const { data: fetchEntry } = await supabase
          .from('journals')
          .select('*')
          .eq('id', id)
          .single();
        if (fetchEntry) entry = fetchEntry;
      }

      if (entry) {
        const pastEntries = useJournalStore.getState().entries;
        // processEntryWithAI generates + saves to Supabase
        const insights = await processEntryWithAI(
          entry.id,
          `${entry.title || 'Untitled'}\n\n${entry.content}`,
          entry.mood,
          entry.user_id,
          pastEntries
        );
        setInsight(insights);
        console.log('[Lesson] P1 interrupt complete. Lesson generated.');
      } else {
        setInsight({
          lessons: ['Your past self could not find this memory. Please try again later.'],
        });
      }
    } catch (err) {
      console.error('P1 Generation failed:', err);
      setInsight({
        lessons: ['Something went wrong while reflecting. Please try again shortly.'],
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleAcknowledge = () => {
    router.back();
  };

  // ── Loading state ──
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.accent} />
        <Text style={styles.loadingText}>Checking for reflections...</Text>
      </View>
    );
  }

  // ── No insight yet: show "Let Me Reflect" button ──
  if (noInsight && !generating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="hourglass-outline" size={32} color={colors.light.accent} />
          </View>

          <View style={styles.card}>
            <Text style={styles.headerTitle}>Not ready yet</Text>
            {journalDate && (
              <Text style={styles.dateLabel}>
                Written {formatDateTime(journalDate)}
              </Text>
            )}
            <Text style={styles.placeholderText}>
              Your past self hasn't reflected on this entry yet. Tap below to let them take a moment.
            </Text>

            <TouchableOpacity
              style={styles.reflectButton}
              activeOpacity={0.8}
              onPress={handleGenerateNow}
            >
              <Ionicons name="sparkles-outline" size={18} color={colors.light.background} />
              <Text style={styles.reflectButtonText}>Let Me Reflect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Generating state ──
  if (generating) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="hourglass-outline" size={64} color={colors.light.accent} />
        </Animated.View>
        <Text style={styles.loadingText}>Reflecting...</Text>
        <Text style={styles.loadingSubtext}>Your past self is thinking about this one.</Text>
      </View>
    );
  }

  // ── Insight ready ──
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="hourglass-outline" size={32} color={colors.light.primary} />
        </View>

        <View style={styles.card}>
          <Text style={styles.headerTitle}>From Your Past Self</Text>
          {journalDate && (
            <Text style={styles.dateLabel}>
              Written {formatDateTime(journalDate)}
            </Text>
          )}

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {insight?.lessons && insight.lessons.length > 0 ? (
              insight.lessons.map((lesson, index) => (
                <View key={index} style={styles.lessonContainer}>
                  <Text style={styles.lessonText}>{lesson}</Text>
                  {index < (insight.lessons?.length || 0) - 1 && <View style={styles.separator} />}
                </View>
              ))
            ) : (
              <Text style={styles.lessonText}>Your past self hasn't left a message here yet.</Text>
            )}
          </ScrollView>

          <View style={styles.signatureLine}>
            <Text style={styles.signatureText}>You</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAcknowledge}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>I hear you</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light.background,
  },
  loadingText: {
    marginTop: 24,
    color: colors.light.text,
    fontSize: 20,
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    color: 'rgba(61,61,61,0.6)',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  contentContainer: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(61,61,61,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(61,61,61,0.03)',
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    maxHeight: '70%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.light.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: 'rgba(61,61,61,0.5)',
    marginBottom: spacing.xl,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
  },
  scrollView: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  lessonText: {
    fontSize: 18,
    lineHeight: 28,
    color: colors.light.text,
    textAlign: 'center',
    fontWeight: '400',
  },
  lessonContainer: {
    width: '100%',
    paddingVertical: spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(61,61,61,0.1)',
    width: '40%',
    alignSelf: 'center',
    marginVertical: spacing.xs,
  },
  signatureLine: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  signatureText: {
    fontSize: 16,
    color: 'rgba(61,61,61,0.6)',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  placeholderText: {
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(61,61,61,0.6)',
    textAlign: 'center',
    marginBottom: 32,
  },
  reflectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.light.text,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    shadowColor: '#3D3D3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  reflectButtonText: {
    color: colors.light.background,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: colors.light.text,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 100,
  },
  actionButtonText: {
    color: colors.light.background,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
