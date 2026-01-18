import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useJournalStore } from '../../../store/journalStore'; // Import store to get entries
import { getEntryInsights } from '../../../services/aiProcessor';
import GradientHeader from '../../../components/GradientHeader';
import { colors, gradients, shadows } from '../../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Find the entry content from the store
  const { entries } = useJournalStore();
  const entry = entries.find(e => e.id === id);

  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [id]);

  const loadInsights = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getEntryInsights(id);
      setInsights(data);
    } catch (error: any) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  };

  if (loading && !insights) {
    return (
      <View style={styles.container}>
        <GradientHeader
          title="From Your Past Self"
          subtitle="Reading your entry..."
          gradient={gradients.primary}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Connecting to your past self...</Text>
        </View>
      </View>
    );
  }

  // If entry didn't load from store for some reason
  const entryText = entry?.content || "Could not load original entry text.";

  return (
    <View style={styles.container}>
      <GradientHeader
        title="From Your Past Self"
        subtitle="A note on what you wrote"
        gradient={gradients.primary}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 1. The Handwritten Note (Past Self) */}
        {insights && (
          <View style={styles.noteContainer}>
            <View style={styles.noteHeader}>
              <Ionicons name="pencil" size={18} color="#92400E" />
              <Text style={styles.noteTitle}>I noticed something...</Text>
            </View>
            <Text style={styles.handwrittenText}>
              "{insights.lesson || "I noticed a pattern in your writing here."}"
            </Text>
          </View>
        )}

        {/* 2. The Entry Context */}
        <View style={styles.entryContainer}>
          <Text style={styles.entryLabel}>YOUR ENTRY</Text>
          <View style={styles.paperSheet}>
            <Text style={styles.entryText}>{entryText}</Text>
          </View>
        </View>

        {/* 3. Future Action */}
        {insights?.reflection && (
          <View style={styles.stickyNote}>
            <View style={styles.pin} />
            <Text style={styles.stickyTitle}>Try this tomorrow:</Text>
            <Text style={styles.stickyText}>{insights.reflection}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Light gray bg
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.light.textSecondary,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  // handwritten note
  noteContainer: {
    backgroundColor: '#FEF3C7', // Amber-100 (Post-it / Note feel)
    padding: 20,
    borderRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#D97706', // Amber-600
    ...shadows.sm,
    transform: [{ rotate: '-1deg' }], // Slight tilt for organic feel
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noteTitle: {
    color: '#92400E', // Amber-800
    fontWeight: 'bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  handwrittenText: {
    fontSize: 18,
    color: '#4B5563',
    fontStyle: 'italic', // Fallback for handwriting font
    lineHeight: 28,
    fontFamily: 'serif',
  },
  // Entry
  entryContainer: {
    gap: 8,
  },
  entryLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
    marginLeft: 4,
  },
  paperSheet: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.sm,
  },
  entryText: {
    fontSize: 16,
    color: '#1F2937', // Gray-800
    lineHeight: 26,
    fontFamily: 'serif', // Book feel
  },
  // Sticky Note
  stickyNote: {
    backgroundColor: '#D1FAE5', // Emerald-100
    padding: 20,
    borderRadius: 2,
    position: 'relative',
    marginTop: 10,
    ...shadows.md,
    transform: [{ rotate: '1deg' }],
  },
  pin: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444', // Red pin
    ...shadows.sm,
  },
  stickyTitle: {
    fontWeight: 'bold',
    color: '#065F46', // Emerald-800
    marginBottom: 4,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  stickyText: {
    color: '#064E3B',
    fontSize: 16,
    lineHeight: 24,
  },
});
