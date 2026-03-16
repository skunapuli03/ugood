import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getEntryInsights } from '../../../services/aiProcessor';
import { supabase } from '../../../services/supabase';
import { colors, borderRadius, spacing } from '../../../utils/theme';
import { formatDateTime } from '../../../utils/format';

interface InsightData {
  lessons?: string[]; // Changed to array
  reflection?: string;
  created_at?: string;
}

export default function LessonViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [journalDate, setJournalDate] = useState<string | null>(null);
  const spinValue = new Animated.Value(0);

  // Set up rotation animation
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [loading]);

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

      // 2. Fetch Insights (using existing service)
      const data = await getEntryInsights(id);

      if (!data) {
        // Fallback for visual testing if no AI data exists
        setInsight({
          lessons: ["Remember to prioritize your peace over temporary approval.", "Trust your intuition; it has guided you well before.", "Embrace the uncertainty as a space for growth, not fear."]
        });
      } else {
        setInsight(data);
      }
    } catch (err) {
      console.error('Error loading lesson:', err);
      // Fallback on error too so user sees UI
      setInsight({
        lessons: ["Remember to prioritize your peace over temporary approval.", "Trust your intuition; it has guided you well before."]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="hourglass-outline" size={64} color={colors.light.primary} />
        </Animated.View>
        <Text style={styles.loadingText}>Connecting to your past self...</Text>
        <Text style={styles.loadingSubtext}>Your local AI is reflecting on your journal.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>

        {/* Header Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="hourglass-outline" size={32} color={colors.light.primary} />
        </View>

        {/* Main Card Content */}
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
            <Text style={styles.signatureText}>— You</Text>
          </View>
        </View>

        {/* Action Button */}
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
    backgroundColor: '#F8F9FA', // Surface color (Clean/Flat)
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 24,
    color: colors.light.text,
    fontSize: 20,
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    color: colors.light.textSecondary,
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
    backgroundColor: '#EEF2FF', // Very light indigo tint
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    // Editorial Shadow (subtle but crisp)
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    maxHeight: '70%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700', // Bold Sans for modern editorial feel
    color: '#111827', // Slate-900
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  dateLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: spacing.xl,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '500',
  },
  scrollView: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  lessonText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '400',
  },
  lessonContainer: {
    width: '100%',
    paddingVertical: spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
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
    color: colors.light.primary, // Indigo signature
    fontWeight: '600',
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: colors.light.primary, // Indigo
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 100, // Pill shape
    // Subtle shadow for lift
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
