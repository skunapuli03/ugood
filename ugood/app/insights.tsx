import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { useJournalStore, JournalEntry } from '../store/journalStore';
import { supabase } from '../services/supabase';
import { getEntryInsights } from '../services/aiProcessor';
import InsightCard from '../components/InsightCard';
import GradientHeader from '../components/GradientHeader';
import { colors, gradients } from '../utils/theme';
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <GradientHeader
        title="Insights"
        subtitle="Lessons from your journey"
        gradient={gradients.primary}
      />

      <View style={styles.content}>
        {loading && insights.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.light.primary} />
          </View>
        ) : insights.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No insights yet</Text>
            <Text style={styles.emptySubtext}>
              Start journaling to receive AI-generated insights!
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>All Lessons</Text>
            {insights.map((insight) => (
              <View key={insight.id} style={styles.insightItem}>
                {insight.entry && (
                  <Text style={styles.entryDate}>
                    {formatDate(insight.entry.created_at)}
                  </Text>
                )}
                <InsightCard
                  title="Lesson Learned"
                  content={insight.lesson || 'No lesson available'}
                  gradient={gradients.secondary}
                />
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
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
});


