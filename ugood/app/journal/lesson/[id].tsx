import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getEntryInsights } from '../../../services/aiProcessor';
import InsightCard from '../../../components/InsightCard';
import GradientHeader from '../../../components/GradientHeader';
import { colors, gradients, borderRadius } from '../../../utils/theme';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
          title="AI Insights"
          subtitle="Analyzing your entry..."
          gradient={gradients.primary}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Generating insights...</Text>
        </View>
      </View>
    );
  }

  if (!insights) {
    return (
      <View style={styles.container}>
        <GradientHeader
          title="AI Insights"
          subtitle="No insights available"
          gradient={gradients.primary}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Insights are still being generated. Please check back in a moment.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <GradientHeader
        title="AI Insights"
        subtitle="Learnings from your entry"
        gradient={gradients.primary}
      />

      <View style={styles.content}>
        <InsightCard
          title="Summary"
          content={insights.summary || 'No summary available'}
          gradient={gradients.primary}
        />

        <InsightCard
          title="Lesson Learned"
          content={insights.lesson || 'No lesson available'}
          gradient={gradients.secondary}
        />

        <InsightCard
          title="Mood Analysis"
          content={insights.moodAnalysis || 'No mood analysis available'}
          gradient={gradients.cool}
        />

        <InsightCard
          title="Reflection Prompt"
          content={insights.reflectionPrompt || 'No reflection prompt available'}
          gradient={gradients.warm}
        />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.light.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});


