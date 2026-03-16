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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useJournalStore } from '../../store/journalStore';
import { useMoodStore } from '../../store/moodStore';
import { getEntryInsights } from '../../services/aiProcessor';
import { useNotificationStore } from '../../store/notificationStore';
import { BackgroundProcessor } from '../../services/backgroundProcessor';
import GradientHeader from '../../components/GradientHeader';
import EntryCard from '../../components/EntryCard';
import { colors, gradients, borderRadius, shadows } from '../../utils/theme';
import { formatDate } from '../../utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const { user, session, initialize } = useUserStore();
  const { entries, loading, fetchEntries } = useJournalStore();
  const { lastMoodAt, frequency, recordMood, fetchLastMoodTime } = useMoodStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedMood, setSelectedMood] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [todayInsight, setTodayInsight] = React.useState<string>('');
  const [timeToNext, setTimeToNext] = React.useState<string | null>(null);

  // Static dictionary of insights
  const wellnessLessons = [
    "Remember that progress, not perfection, is the goal. Each small step you take is a victory.",
    "Your feelings are valid. Give yourself permission to feel them fully.",
    "Rest is not a reward, it's a necessity. Take time to recharge.",
    "Be kind to yourself today. You are doing the best you can.",
    "Growth often happens outside your comfort zone.",
    "Small consistent actions lead to big changes over time."
  ];

  const onViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  useEffect(() => {
    if (!session) {
      initialize();
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      if (user) {
        await Promise.all([
          fetchEntries(user.id),
          fetchLastMoodTime(user.id),
          fetchNotifications(user.id)
        ]);

        // Now that data is fetched, run the background check
        BackgroundProcessor.runCheck(user.id);
      }
    };

    initData();
  }, [user]);

  useEffect(() => {
    // Pick a random lesson for the day (simple implementation)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const lessonIndex = dayOfYear % wellnessLessons.length;
    setTodayInsight(wellnessLessons[lessonIndex]);
  }, []);

  // Live countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      if (!lastMoodAt) {
        setTimeToNext(null);
        return;
      }

      const now = Date.now();
      const throttleMs = frequency * 60 * 1000;
      const diff = now - lastMoodAt;

      if (diff < throttleMs) {
        const remainingMs = throttleMs - diff;
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);

        if (mins > 0) {
          setTimeToNext(`${mins}m remaining`);
        } else {
          setTimeToNext(`${secs}s remaining`);
        }
      } else {
        setTimeToNext(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lastMoodAt, frequency]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (user) {
      await Promise.all([
        fetchEntries(user.id),
        fetchNotifications(user.id)
      ]);
    }
    setRefreshing(false);
  }, [user, fetchEntries]);

  const recentEntries = useMemo(() => entries.slice(0, 5), [entries]);

  const moodEmojis = ['😊', '😐', '😔'];
  const moodColors = ['#D4F4DD', '#E5E7EB', '#DBEAFE'];
  const checkmarkAnimations = useRef(moodEmojis.map(() => new Animated.Value(0))).current;
  const scaleAnimations = useRef(moodEmojis.map(() => new Animated.Value(1))).current;

  const isMoodThrottled = useMemo(() => {
    if (!lastMoodAt) return false;
    const now = Date.now();
    return (now - lastMoodAt) < (frequency * 60 * 1000);
  }, [lastMoodAt, frequency]);

  const handleMoodPress = async (emoji: string, index: number) => {
    if (!user) return;

    if (isMoodThrottled) {
      Alert.alert('Mood Saved!', `Your mood has been recorded! We'll stay by your side until it's time for the next check-in.`);
      return;
    }

    const { success, message } = await recordMood(user.id, emoji);
    if (!success) {
      Alert.alert('Notification', message);
      return;
    }

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
      Animated.delay(1500),
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
        rightElement={
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push({ pathname: '/inbox' } as any)}
          >
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <View style={styles.content}>
        {/* Today's Mood Card - Overlapping the header */}
        <View style={styles.moodCard}>
          <View style={styles.moodCardHeader}>
            <Text style={styles.moodCardTitle}>Today's Mood</Text>
            {timeToNext && (
              <View style={styles.throttleBadge}>
                <Ionicons name="time-outline" size={14} color={colors.light.primary} />
                <Text style={styles.throttleText}>{timeToNext}</Text>
              </View>
            )}
          </View>
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
                        opacity: 1,
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
            {recentEntries.length >= 4 && (
              <View style={styles.paginationDots}>
                {[0, 1, 2, 3].map((dot, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      activeIndex === index && styles.dotActive,
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
                data={recentEntries.slice(0, 4)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.entryCardWrapper}>
                    <EntryCard
                      entry={item}
                      onPress={() => router.push(`/journal/view/${item.id}`)}
                      onEdit={() => router.push(`/journal/edit/${item.id}`)}
                      onViewLesson={() => router.push(`/journal/lesson/${item.id}`)}
                      onDelete={async () => {
                        const { deleteEntry } = useJournalStore.getState();
                        await deleteEntry(item.id);
                      }}
                    />
                  </View>
                )}
                contentContainerStyle={styles.entriesList}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                snapToInterval={280 + 12} // card width + margin
                decelerationRate="fast"
              />
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push('/(tabs)/journals')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>View All Journals</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.light.textSecondary} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Today's Insight Section */}
        <View style={styles.insightSection}>
          <Text style={styles.sectionTitle}>Today's insight</Text>
          <View style={styles.insightCard}>
            <Text style={styles.insightText}>
              {todayInsight}
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
  },
  moodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  throttleBadge: {
    backgroundColor: colors.light.primary + '10', // Light indigo background
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.light.primary + '33', // Subtle indigo border
  },
  throttleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.primary,
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
  entryCardWrapper: {
    width: 280,
    marginRight: 12,
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
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

