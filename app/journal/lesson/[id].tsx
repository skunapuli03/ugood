import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getEntryInsights, processEntryWithAI } from '../../../services/aiProcessor';
import { useJournalStore } from '../../../store/journalStore';
import { supabase } from '../../../services/supabase';
import { colors, borderRadius, spacing, shadows } from '../../../utils/theme';
import { formatDateTime } from '../../../utils/format';

interface InsightData {
  lessons?: string[];
  summary?: string;
  created_at?: string;
}

export default function LessonViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [journalDate, setJournalDate] = useState<string | null>(null);

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

      // 2. Check for existing insight
      const data = await getEntryInsights(id as string);
      if (data && data.lessons && data.lessons.length > 0) {
        setInsight(data);
      }
    } catch (err) {
      console.error('Error loading reflection:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  // Generate reflection on-demand ONLY when user taps the button
  const handleGenerateNow = async () => {
    if (!id || generating) return;
    setGenerating(true);

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
        const insights = await processEntryWithAI(
          entry.id,
          `${entry.title || 'Untitled'}\n\n${entry.content}`,
          entry.mood,
          entry.user_id,
          pastEntries
        );
        setInsight(insights);
      } else {
        setInsight({
          lessons: ['Notice what is draining your energy today, and let go of what was never yours to carry.'],
        });
      }
    } catch (err) {
      console.error('On-demand generation failed:', err);
      setInsight({
        lessons: ['Take a quiet moment to breathe. Action creates clarity where overthinking creates doubt.'],
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleAcknowledge = () => {
    router.back();
  };

  // Extract the lesson text
  const lessonText = insight?.lessons && insight.lessons.length > 0
    ? insight.lessons[0]
    : (insight?.summary || null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Back / Close button at top */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={26} color="rgba(61,61,61,0.6)" />
          </TouchableOpacity>
        </View>

        {/* Main Lesson Card */}
        <View style={styles.card}>
          <Text style={styles.headerTitle}>From Your Past Self</Text>
          {journalDate && (
            <Text style={styles.dateLabel}>
              Written {formatDateTime(journalDate)}
            </Text>
          )}

          {loadingInitial ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color={colors.light.accent} />
            </View>
          ) : lessonText ? (
            /* Brief and specific lesson */
            <View style={styles.reflectionBody}>
              <Text style={styles.oneSentenceText}>
                "{lessonText}"
              </Text>
              
              <View style={styles.signatureLine}>
                <Text style={styles.signatureText}>— Your Past Self</Text>
              </View>
            </View>
          ) : (
            /* Not generated yet — clean on-demand trigger */
            <View style={styles.promptBody}>
              <Text style={styles.placeholderText}>
                Take a quiet moment. When you're ready, uncover the lesson waiting in this reflection.
              </Text>

              <TouchableOpacity
                style={[styles.reflectButton, generating && styles.reflectButtonDisabled]}
                activeOpacity={0.85}
                onPress={handleGenerateNow}
                disabled={generating}
              >
                {generating ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator size="small" color={colors.light.background} />
                    <Text style={styles.reflectButtonText}>Reflecting...</Text>
                  </View>
                ) : (
                  <Text style={styles.reflectButtonText}>View Lesson</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom Acknowledgment Action */}
        {lessonText && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAcknowledge}
              activeOpacity={0.85}
            >
              <Text style={styles.actionButtonText}>I hear you</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 16,
    left: 20,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  iconContainer: {
    marginBottom: 20,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(184, 161, 209, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: borderRadius.xxl,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 6,
    textAlign: 'center',
  },
  dateLabel: {
    fontSize: 11,
    color: 'rgba(61,61,61,0.45)',
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  inlineLoading: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  reflectionBody: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  oneSentenceText: {
    fontSize: 21,
    lineHeight: 34,
    color: colors.light.text,
    textAlign: 'center',
    fontWeight: '400',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: 0.2,
  },
  signatureLine: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: 20,
  },
  signatureText: {
    fontSize: 15,
    color: colors.light.accent,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  promptBody: {
    width: '100%',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(61,61,61,0.65)',
    textAlign: 'center',
    marginBottom: 28,
  },
  reflectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.light.text,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: borderRadius.xl,
    width: '100%',
    ...shadows.md,
  },
  reflectButtonDisabled: {
    opacity: 0.6,
  },
  reflectButtonText: {
    color: colors.light.background,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footer: {
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: colors.light.text,
    paddingVertical: 16,
    paddingHorizontal: 44,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  actionButtonText: {
    color: colors.light.background,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
