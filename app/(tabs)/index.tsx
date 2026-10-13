import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useJournalStore } from '../../store/journalStore';
import { useMoodStore } from '../../store/moodStore';
import { generateMoodStrategy } from '../../services/offlineAI';
import { useNotificationStore } from '../../store/notificationStore';
import { BackgroundProcessor, FOR_YOU_CARDS_KEY } from '../../services/backgroundProcessor';
import { colors, borderRadius, shadows } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Calendar strip data
const getWeekDays = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const days = [];
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + mondayOffset + i);
    days.push({
      label: dayLabels[i],
      date: d.getDate(),
      isToday: d.toDateString() === now.toDateString(),
    });
  }
  return days;
};

const defaultForYouCards = [
  {
    title: 'When Work Stresses You',
    action: 'Read more',
    bg: colors.light.pastelMint,
    iconColor: '#16A34A',
    actionColor: 'rgba(21,128,61,0.7)',
    icon: 'checkmark-circle-outline' as const,
  },
  {
    title: 'Beating Mistakes',
    action: 'View tip',
    bg: colors.light.pastelYellow,
    iconColor: '#CA8A04',
    actionColor: 'rgba(161,98,7,0.7)',
    icon: 'sunny-outline' as const,
  },
];

// We only use standard neutrals now for most cards for a peaceful UI

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session, initialize } = useUserStore();
  const { entries, loading, fetchEntries } = useJournalStore();
  const { fetchLastMoodTime } = useMoodStore();
  const { notifications, unreadCount, fetchNotifications } = useNotificationStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const latestPattern = useMemo(() => {
    return notifications.find(n => n.type === 'past_self');
  }, [notifications]);

  // Modal states
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [selectedFocusMood, setSelectedFocusMood] = useState<string | null>(null);
  const [focusStrategy, setFocusStrategy] = useState<string | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);

  const [showPatternModal, setShowPatternModal] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<any | null>(null);
  const [aiCardsContent, setAiCardsContent] = useState<any[]>([]);

  useEffect(() => {
    const loadAiCards = async () => {
      try {
        const saved = await AsyncStorage.getItem(FOR_YOU_CARDS_KEY);
        if (saved) {
          setAiCardsContent(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Error loading AI cards:', e);
      }
    };
    loadAiCards();
  }, []);

  useEffect(() => {
    if (showFocusModal && selectedFocusMood) {
      const getStrategy = async () => {
        setLoadingStrategy(true);
        try {
          const strategy = await generateMoodStrategy(selectedFocusMood, entries);
          setFocusStrategy(strategy);
        } catch (e) {
          setFocusStrategy("Take a deep breath. Focus on what you can control right now.");
        } finally {
          setLoadingStrategy(false);
        }
      };
      getStrategy();
    } else {
      setFocusStrategy(null);
    }
  }, [showFocusModal, selectedFocusMood]);

  const weekDays = useMemo(() => getWeekDays(), []);
  // Generate data-driven cards dynamically without AI cost
  const dynamicCards = useMemo(() => {
    // 1. Get Consecutive Day Streak
    const getStreak = () => {
      if (entries.length === 0) return 0;
      const dates = [...new Set(entries.map((e: any) => new Date(e.created_at).toISOString().split('T')[0]))];
      dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
      if (dates[0] !== todayStr && dates[0] !== yesterdayStr) return 0;
      let streak = 1;
      let expected = new Date(dates[0]);
      for (let i = 1; i < dates.length; i++) {
        expected.setDate(expected.getDate() - 1);
        if (dates[i] === expected.toISOString().split('T')[0]) streak++;
        else break;
      }
      return streak;
    };

    const streak = getStreak();
    const cards = [];

    // Card 1: Streak / Momentum
    if (streak > 0) {
      cards.push({
        title: `${streak} Day Streak!`,
        action: 'Keep it going',
        bg: colors.light.pastelMint,
        iconColor: '#16A34A',
        actionColor: 'rgba(21,128,61,0.7)',
        icon: 'flame-outline' as const,
        onPress: () => router.push('/journal/new'),
      });
    } else {
      cards.push({
        title: 'Start a Streak',
        action: 'Check in now',
        bg: 'rgba(61,61,61,0.05)',
        iconColor: 'rgba(61,61,61,0.6)',
        actionColor: 'rgba(61,61,61,0.8)',
        icon: 'calendar-outline' as const,
        onPress: () => router.push('/journal/emotions'),
      });
    }

    // Card 2: Primary Mood Focus (Requires 3/5 threshold)
    if (entries.length > 0) {
      const recentMoods = entries.slice(0, 5).map(e => (e.mood || '').split(',')[0].toLowerCase().trim());
      const counts: Record<string, number> = {};
      recentMoods.forEach(m => { if (m) counts[m] = (counts[m] || 0) + 1; });
      const sortedMoods = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      
      if (sortedMoods.length > 0 && sortedMoods[0][1] >= 3) {
        const dominantMood = sortedMoods[0][0];
        const negativeMoods = ['sad', 'anxious', 'annoyed', 'angry', 'stress', 'fearful', 'tired', 'depressed', 'bored'];
        const isNegative = negativeMoods.some(m => dominantMood.toLowerCase().includes(m));
        const titlePrefix = isNegative ? 'Navigating' : 'Harnessing';

        cards.push({
          title: `${titlePrefix} feeling ${dominantMood.charAt(0).toUpperCase() + dominantMood.slice(1)}`,
          action: 'View strategy',
          bg: colors.light.pastelBlue,
          iconColor: '#2563EB',
          actionColor: 'rgba(37,99,235,0.7)',
          icon: 'water-outline' as const,
          onPress: () => {
            setSelectedFocusMood(dominantMood);
            setShowFocusModal(true);
          },
        });
      } else {
        // No strong momentum, just standard check in
        cards.push({
          title: 'Daily Reflection',
          action: 'Write entry',
          bg: 'rgba(61,61,61,0.05)',
          iconColor: 'rgba(61,61,61,0.6)',
          actionColor: 'rgba(61,61,61,0.8)',
          icon: 'pencil-outline' as const,
          onPress: () => router.push('/journal/new'),
        });
      }
    } else {
      cards.push({
        title: 'Your Past Self',
        action: 'Write entry',
        bg: 'rgba(61,61,61,0.05)',
        iconColor: 'rgba(61,61,61,0.6)',
        actionColor: 'rgba(61,61,61,0.8)',
        icon: 'pencil-outline' as const,
        onPress: () => router.push('/journal/new'),
      });
    }

    // 3. AI-generated cards from BackgroundProcessor
    aiCardsContent.forEach(aiCard => {
      cards.push({
        title: aiCard.title,
        action: 'View insight',
        bg: 'rgba(61,61,61,0.05)',
        iconColor: 'rgba(61,61,61,0.6)',
        actionColor: 'rgba(61,61,61,0.8)',
        icon: (aiCard.type === 'observation' ? 'eye-outline' : 'bulb-outline') as any,
        onPress: () => {
          setSelectedPattern({ title: aiCard.title, analysis: aiCard.content });
          setShowPatternModal(true);
        },
      });
    });

    return cards;
  }, [entries, aiCardsContent]);

  useEffect(() => {
    const initData = async () => {
      if (user) {
        await Promise.all([
          fetchEntries(user.id),
          fetchLastMoodTime(user.id),
          fetchNotifications(user.id),
        ]);
        BackgroundProcessor.runPipeline(user.id);
      }
    };
    initData();
  }, [user]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (user) {
      await Promise.all([
        fetchEntries(user.id),
        fetchNotifications(user.id),
      ]);
    }
    setRefreshing(false);
  }, [user]);

  if (!session || !user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.light.accent} />
      </View>
    );
  }

  const userName = user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Guest';

  const firstName = userName.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {/* Greeting */}
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.greetingName}>{firstName}</Text>
            </View>

            {/* Top Right Actions */}
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={() => router.push('/notifications' as any)}
              >
                <Ionicons name="notifications-outline" size={24} color="rgba(61,61,61,0.6)" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={() => router.push('/settings' as any)}
              >
                <Ionicons name="settings-outline" size={24} color="rgba(61,61,61,0.6)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Calendar Strip */}
          <View style={styles.calendarStrip}>
            {weekDays.map((day: any, index: number) => (
              <View key={index} style={[styles.calendarDay, !day.isToday && { opacity: 0.4 }]}>
                <Text style={[
                  styles.calendarDayLabel,
                  day.isToday && { fontWeight: '700', color: colors.light.accent },
                ]}>
                  {day.label}
                </Text>
                <View style={[
                  styles.calendarDateCircle,
                  day.isToday && styles.calendarDateActive,
                ]}>
                  <Text style={[
                    styles.calendarDateText,
                    day.isToday && { color: '#FFFFFF', fontWeight: '600' },
                  ]}>
                    {day.date}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Primary Action: Check In */}
        <View style={styles.checkInSection}>
          <Text style={styles.checkInTitle}>How do you feel?</Text>
          <View style={styles.checkInWrapper}>
            <TouchableOpacity
              style={styles.checkInButton}
              activeOpacity={0.8}
              onPress={() => router.push('/journal/emotions' as any)}
            >
              <Text style={styles.checkInButtonText}>Check In</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.light.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* For You Section */}
        <View style={styles.forYouSection}>
          <View style={styles.forYouHeader}>
            <Text style={styles.forYouLabel}>FOR YOU</Text>
            <Text style={styles.forYouSub}>Daily focus areas and momentum tracking based on your entries.</Text>
          </View>

          {/* 2-Column Pastel Cards */}
          <View style={styles.cardGrid}>
            {dynamicCards.map((card: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={[styles.pastelCard, { backgroundColor: card.bg }]}
                activeOpacity={0.8}
                onPress={card.onPress}
              >
                <View style={styles.pastelCardIcon}>
                  <Ionicons name={card.icon} size={24} color={card.iconColor} />
                </View>
                <Text style={styles.pastelCardTitle}>{card.title}</Text>
                <View style={styles.pastelCardAction}>
                  <Text style={[styles.pastelCardActionText, { color: card.actionColor }]}>
                    {card.action}
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={card.actionColor} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pattern Alert Card */}
          {latestPattern && (
            <View style={styles.patternCard}>
              <View style={styles.patternHeader}>
                <View style={styles.patternIcon}>
                  <Ionicons name="bulb-outline" size={20} color="#EA580C" />
                </View>
                <Text style={styles.patternTitle}>{latestPattern.title || 'Recurring Pattern'}</Text>
              </View>
              <Text style={styles.patternDesc} numberOfLines={3}>
                {latestPattern.content}
              </Text>
              <TouchableOpacity
                style={styles.patternAction}
                onPress={() => {
                  setSelectedPattern({ title: latestPattern.title, analysis: latestPattern.content });
                  setShowPatternModal(true);
                }}
              >
                <Text style={styles.patternActionText}>View full analysis</Text>
                <Ionicons name="arrow-forward" size={14} color="#C2410C" />
              </TouchableOpacity>
            </View>
          )}

          {/* Temporal Map Card */}
          <TouchableOpacity
            style={styles.temporalCard}
            activeOpacity={0.8}
            onPress={() => router.push('/profile' as any)}
          >
            <View style={styles.temporalContent}>
              <View>
                <Text style={styles.temporalTitle}>Temporal Map</Text>
                <Text style={styles.temporalLabel}>PAST 6 DAYS</Text>
              </View>
              <View style={styles.temporalIcon}>
                <Ionicons name="bar-chart-outline" size={24} color="#3B82F6" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Mood Strategy Modal */}
      <Modal
        visible={showFocusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFocusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowFocusModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.light.text} />
            </TouchableOpacity>

            <Text style={styles.modalLabel}>Strategy for {selectedFocusMood}</Text>
            <Text style={styles.modalSubtitle}>How to handle this moment</Text>

            {loadingStrategy ? (
              <View style={{ height: 100, justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.light.accent} />
              </View>
            ) : (
              <Text style={styles.modalBodyText}>{focusStrategy || "Take a deep breath. Focus on what you can control right now."}</Text>
            )}

            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={() => setShowFocusModal(false)}
            >
              <Text style={styles.modalActionButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pattern Detail Modal */}
      <Modal
        visible={showPatternModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPatternModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPatternModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.light.text} />
            </TouchableOpacity>

            <View style={styles.modalIconBox}>
              <Ionicons name="bulb-outline" size={32} color="#EA580C" />
            </View>

            <Text style={styles.modalPatternTitle}>{selectedPattern?.title}</Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalBodyText}>{selectedPattern?.analysis}</Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={() => setShowPatternModal(false)}
            >
              <Text style={styles.modalActionButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background, // #F5F2EA
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120, // Space for bottom nav
  },

  // Header
  header: {
    marginBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.light.text, // #3D3D3D
    lineHeight: 36,
    // Playfair Display would be set via fontFamily when loaded
  },
  greetingName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.light.text,
    lineHeight: 36,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 4,
  },
  headerIcon: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Calendar Strip
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  calendarDay: {
    alignItems: 'center',
  },
  calendarDayLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    color: colors.light.text,
  },
  calendarDateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDateActive: {
    backgroundColor: colors.light.accent, // #B8A1D1 lavender
    ...shadows.sm,
  },
  calendarDateText: {
    fontSize: 14,
    color: colors.light.text,
  },

  // Check In
  checkInSection: {
    marginBottom: 48,
  },
  checkInTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 16,
    // Playfair Display
  },
  checkInWrapper: {
    backgroundColor: 'rgba(61,61,61,0.05)', // charcoal/5
    padding: 8,
    borderRadius: borderRadius.xxl, // 32
  },
  checkInButton: {
    backgroundColor: colors.light.primary, // Trust Blue
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: borderRadius.xl, // 24
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.lg,
  },
  checkInButtonText: {
    color: colors.light.text,
    fontSize: 18,
    fontWeight: '600',
  },

  // For You
  forYouSection: {
    flex: 1,
  },
  forYouHeader: {
    marginBottom: 24,
  },
  forYouLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  forYouSub: {
    fontSize: 12,
    color: 'rgba(61,61,61,0.5)',
  },

  // 2-Column Pastel Cards
  cardGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  pastelCard: {
    flex: 1,
    padding: 24,
    borderRadius: borderRadius.xxxl, // 40 — 2.5rem
    aspectRatio: 4 / 5,
    justifyContent: 'flex-start',
  },
  pastelCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pastelCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    lineHeight: 24,
    marginBottom: 16,
    // Playfair Display
  },
  pastelCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  pastelCardActionText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Pattern Alert
  patternCard: {
    backgroundColor: 'rgba(255,224,178,0.4)', // pastel-orange/40
    padding: 24,
    borderRadius: borderRadius.xxl, // 32 — 2rem
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 24,
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  patternIcon: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
  },
  patternTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.light.text,
    // Playfair Display
  },
  patternDesc: {
    fontSize: 14,
    color: 'rgba(61,61,61,0.8)',
    lineHeight: 22,
    marginBottom: 16,
  },
  patternAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patternActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C2410C',
  },

  // Temporal Map
  temporalCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(61,61,61,0.05)',
    ...shadows.sm,
    marginBottom: 48,
  },
  temporalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  temporalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
    // Playfair Display
  },
  temporalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  temporalIcon: {
    padding: 12,
    backgroundColor: colors.light.pastelBlue,
    borderRadius: borderRadius.xl,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.light.background,
    borderRadius: borderRadius.xxl,
    padding: 32,
    width: '100%',
    position: 'relative',
    ...shadows.lg,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.accent,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.light.text,
    marginBottom: 20,
  },
  modalBodyText: {
    fontSize: 16,
    color: 'rgba(61,61,61,0.8)',
    lineHeight: 24,
    marginBottom: 32,
  },
  modalActionButton: {
    backgroundColor: colors.light.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalActionButtonText: {
    color: colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(234,88,12,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalPatternTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.light.text,
    marginBottom: 16,
  },
});
