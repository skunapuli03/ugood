import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useJournalStore } from '../../store/journalStore';
import { getEntryInsights } from '../../services/aiProcessor';
import GradientHeader from '../../components/GradientHeader';
import { colors, gradients, borderRadius, shadows } from '../../utils/theme';
import { formatDate } from '../../utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const { user, session, initialize } = useUserStore();
  const { entries, loading, fetchEntries } = useJournalStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedMood, setSelectedMood] = React.useState('');
  const [todayInsight, setTodayInsight] = React.useState<any>(null);

  useEffect(() => {
    if (!session) {
      initialize();
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchEntries(user.id);
    }
  }, [user]);

  useEffect(() => {
    const loadTodayInsight = async () => {
      if (entries.length > 0) {
        const latestEntry = entries[0];
        const insight = await getEntryInsights(latestEntry.id);
        setTodayInsight(insight);
      }
    };
    loadTodayInsight();
  }, [entries]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (user) {
      await fetchEntries(user.id);
    }
    setRefreshing(false);
  }, [user, fetchEntries]);

  const recentEntries = useMemo(() => entries.slice(0, 5), [entries]);

  const moodEmojis = ['😊', '😐', '😔'];
  const moodColors = ['#D4F4DD', '#E5E7EB', '#DBEAFE'];
  const checkmarkAnimations = useRef(moodEmojis.map(() => new Animated.Value(0))).current;
  const scaleAnimations = useRef(moodEmojis.map(() => new Animated.Value(1))).current;

  const handleMoodPress = (emoji: string, index: number) => {
    setSelectedMood(emoji);
    
    // Reset animations
    checkmarkAnimations[index].setValue(0);
    scaleAnimations[index].setValue(1);
    
    // Scale up then down animation
    Animated.sequence([
      Animated.spring(scaleAnimations[index], {
        toValue: 1.2,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnimations[index], {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Show checkmark animation
    Animated.sequence([
      Animated.timing(checkmarkAnimations[index], {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(checkmarkAnimations[index], {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (!session || !user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  const userName = user.user_metadata?.full_name || 
                   user.user_metadata?.name || 
                   user.email?.split('@')[0] || 
                   'Guest';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <GradientHeader
        title={`Hello, ${userName}!`}
        subtitle="Take a moment to reflect and capture your thoughts"
      />

      <View style={styles.content}>
        {/* Today's Mood Card - Overlapping the header */}
        <View style={styles.moodCard}>
          <Text style={styles.moodCardTitle}>Today's Mood</Text>
          <View style={styles.moodButtonsContainer}>
            {moodEmojis.map((emoji, index) => {
              const scale = scaleAnimations[index];
              const checkmarkOpacity = checkmarkAnimations[index];
              const checkmarkScale = checkmarkAnimations[index].interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 1.2, 1],
              });

              return (
                <View key={emoji} style={styles.moodButtonWrapper}>
                  <Animated.View
                    style={[
                      styles.moodButton,
                      {
                        backgroundColor: selectedMood === emoji 
                          ? moodColors[index] 
                          : '#F3F4F6',
                        transform: [{ scale }],
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.moodButtonInner}
                      onPress={() => handleMoodPress(emoji, index)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.moodEmoji}>{emoji}</Text>
                      
                      {/* Checkmark overlay */}
                      <Animated.View
                        style={[
                          styles.checkmarkOverlay,
                          {
                            opacity: checkmarkOpacity,
                            transform: [{ scale: checkmarkScale }],
                          },
                        ]}
                      >
                        <View style={styles.checkmarkContainer}>
                          <Ionicons name="checkmark-circle" size={32} color={colors.light.primary} />
                        </View>
                      </Animated.View>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Recent Entries Section */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent entries</Text>
            {recentEntries.length >= 3 && (
              <View style={styles.paginationDots}>
                {[0, 1, 2, 3].map((dot, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index === 0 && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          {loading && entries.length === 0 ? (
            <ActivityIndicator size="large" color={colors.light.primary} />
          ) : recentEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="journal-outline" size={64} color={colors.light.textSecondary} />
              <Text style={styles.emptyText}>No entries yet</Text>
              <Text style={styles.emptySubtext}>Start your journaling journey!</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={recentEntries.slice(0, 3)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  // Extract title and preview from content
                  const parts = item.content.split('\n\n');
                  const title = parts[0] || 'Untitled Entry';
                  const preview = parts.length > 1 ? parts.slice(1).join(' ') : item.content;
                  
                  return (
                    <TouchableOpacity
                      style={styles.entryCard}
                      onPress={() => router.push(`/journal/view/${item.id}`)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.entryCardTitle} numberOfLines={1}>
                        {title.length > 30 ? title.substring(0, 30) + '...' : title}
                      </Text>
                      <Text style={styles.entryCardPreview} numberOfLines={3}>
                        {preview.length > 80 ? preview.substring(0, 80) + '...' : preview}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.entriesList}
              />
              {entries.length >= 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => router.push('/(tabs)/journals')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>View All Journals</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.light.textSecondary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Today's Insight Section */}
        <View style={styles.insightSection}>
          <Text style={styles.sectionTitle}>Today's insight</Text>
          <View style={styles.insightCard}>
            <Text style={styles.insightText}>
              {todayInsight?.lesson || todayInsight?.reflectionPrompt || 'Remember that progress, not perfection, is the goal. Each small step you take is a victory.'}
            </Text>
          </View>
        </View>
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
    paddingHorizontal: 24,
  },
  moodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: 28,
    marginTop: -40,
    marginBottom: 32,
    ...shadows.lg,
  },
  moodCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 24,
  },
  moodButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 20,
  },
  moodButtonWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
    overflow: 'hidden',
  },
  moodButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 40,
  },
  checkmarkOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 35,
  },
  checkmarkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentSection: {
    marginTop: 8,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  paginationDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.light.border,
  },
  dotActive: {
    backgroundColor: colors.light.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entriesList: {
    paddingRight: 20,
  },
  entryCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: 16,
    marginRight: 12,
  },
  entryCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 8,
  },
  entryCardPreview: {
    fontSize: 14,
    color: colors.light.textSecondary,
    lineHeight: 20,
  },
  insightSection: {
    marginTop: 16,
  },
  insightCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: borderRadius.lg,
    padding: 24,
    marginTop: 12,
  },
  insightText: {
    fontSize: 16,
    color: '#0C4A6E',
    fontStyle: 'italic',
    lineHeight: 24,
    paddingTop: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    gap: 6,
  },
  viewAllText: {
    fontSize: 15,
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginTop: 8,
  },
});

