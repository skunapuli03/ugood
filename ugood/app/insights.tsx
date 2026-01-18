import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { useJournalStore, JournalEntry } from '../store/journalStore';
import { supabase } from '../services/supabase';
import { getEntryInsights } from '../services/aiProcessor';
import GradientHeader from '../components/GradientHeader';
import { colors, gradients, borderRadius, shadows } from '../utils/theme';
import { formatDate } from '../utils/format';

interface Insight {
  id: string;
  entry_id: string;
  lesson: string;
  created_at: string;
  entry?: {
    content: string;
    mood: string;
    created_at: string;
  };
}

export default function InsightsScreen() {
  const router = useRouter();
  const { user } = useUserStore();
  const { entries, fetchEntries } = useJournalStore();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadInsights();
    }
  }, [user, entries]);

  const loadInsights = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with entry data
      const enrichedInsights = (data || []).map((insight) => {
        const entry = entries.find((e: JournalEntry) => e.id === insight.entry_id);
        return {
          ...insight,
          entry,
        };
      });

      setInsights(enrichedInsights);
    } catch (error: any) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await fetchEntries(user.id);
      await loadInsights();
    }
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <GradientHeader
        title="What Your Journal Noticed"
        subtitle="Patterns and discoveries from your writing"
        gradient={gradients.primary}
      />

      <View style={styles.content}>
        {loading && insights.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.light.primary} />
          </View>
        ) : insights.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="sparkles-outline" size={64} color={colors.light.textSecondary} />
            <Text style={styles.emptyText}>Nothing noticed yet</Text>
            <Text style={styles.emptySubtext}>
              Your journal will start noticing patterns and discoveries as you write more!
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Things Your Journal Noticed</Text>
            {insights.map((insight) => (
              <View key={insight.id} style={styles.insightItem}>
                {insight.entry && (
                  <Text style={styles.entryDate}>
                    {formatDate(insight.entry.created_at)}
                  </Text>
                )}
                <View style={styles.insightCard}>
                  <View style={styles.insightCardHeader}>
                    <Ionicons name="bulb-outline" size={20} color="#0C4A6E" />
                    <Text style={styles.insightCardTitle}>Your Journal Noticed...</Text>
                  </View>
                  <Text style={styles.insightCardContent}>
                    {insight.lesson || 'Keep writing to discover more patterns!'}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 16,
  },
  insightItem: {
    marginBottom: 20,
  },
  entryDate: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  insightCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: borderRadius.lg,
    padding: 20,
  },
  insightCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0C4A6E',
  },
  insightCardContent: {
    fontSize: 16,
    color: '#0C4A6E',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});


