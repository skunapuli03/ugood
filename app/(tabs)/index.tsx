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
  Platform,
  Alert,
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
import EntryCard from '../../components/EntryCard';
import { getEntryInsights } from '../../services/aiProcessor';
import { formatDate } from '../../utils/format';

// Calendar strip data with week offset support
const getWeekDays = (weekOffset = 0) => {
  const now = new Date();
  // Apply week offset
  now.setDate(now.getDate() + weekOffset * 7);

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
      fullDate: d,
      isToday: d.toDateString() === new Date().toDateString(),
    });
  }
  return days;
};

// Check if a date is strictly in the future compared to today
const isFutureDay = (d: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return target.getTime() > today.getTime();
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useUserStore();
  const { entries, fetchEntries, deleteEntry } = useJournalStore();
  const { fetchLastMoodTime } = useMoodStore();
  const { notifications, unreadCount, fetchNotifications } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);

  // Calendar & Date states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const isViewingToday = useMemo(() => {
    return selectedDate.toDateString() === new Date().toDateString();
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    return getWeekDays(weekOffset);
  }, [weekOffset]);

  // Entries filtered for the currently selected date
  const entriesOnSelectedDate = useMemo(() => {
    return entries.filter(e => {
      const d = new Date(e.created_at);
      return d.toDateString() === selectedDate.toDateString();
    });
  }, [entries, selectedDate]);

  // Meaningful past memory (from before today or an earlier reflection)
  const pastMemory = useMemo(() => {
    if (entries.length === 0) return null;
    const todayStr = new Date().toDateString();
    const older = entries.filter(e => new Date(e.created_at).toDateString() !== todayStr);
    if (older.length > 0) {
      return older[0];
    }
    return entries[0];
  }, [entries]);

  // Dominant emotion for Grounding Insight card
  const dominantMood = useMemo(() => {
    if (entries.length === 0) return null;
    const recentMoods = entries
      .slice(0, 5)
      .map(e => (e.mood || '').split(',')[0].toLowerCase().trim())
      .filter(Boolean);
    if (recentMoods.length === 0) return null;
    const counts: Record<string, number> = {};
    recentMoods.forEach(m => {
      counts[m] = (counts[m] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : null;
  }, [entries]);

  const latestPattern = useMemo(() => {
    return notifications.find(n => n.type === 'past_self');
  }, [notifications]);

  // Modals state
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [pastResilienceLesson, setPastResilienceLesson] = useState<string | null>(null);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [selectedFocusMood, setSelectedFocusMood] = useState<string | null>(null);
  const [focusStrategy, setFocusStrategy] = useState<string | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);

  // Fetch past resilience lesson tied to past memory
  useEffect(() => {
    if (pastMemory?.id) {
      getEntryInsights(pastMemory.id).then(insights => {
        if (insights && insights.lessons && insights.lessons.length > 0) {
          setPastResilienceLesson(insights.lessons[0]);
        } else if (insights && insights.summary) {
          setPastResilienceLesson(insights.summary);
        } else {
          setPastResilienceLesson(null);
        }
      }).catch(() => {
        setPastResilienceLesson(null);
      });
    } else {
      setPastResilienceLesson(null);
    }
  }, [pastMemory?.id]);

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
          setFocusStrategy("Take a slow breath. Notice what is within your control right now, and let the rest wait.");
        } finally {
          setLoadingStrategy(false);
        }
      };
      getStrategy();
    } else {
      setFocusStrategy(null);
    }
  }, [showFocusModal, selectedFocusMood]);

  // Data-driven FOR YOU 2-column cards (Strictly insights & memories tied to lessons)
  const dynamicCards = useMemo(() => {
    const cards = [];

    // Card 1: Past Resilience / Overcoming (Tied to a past lesson or navigated moment)
    if (pastMemory) {
      const rawMood = pastMemory.mood ? pastMemory.mood.split(',')[0].replace(/[\u1000-\uFFFF]+/g, '').trim() : '';
      const moodLabel = rawMood ? rawMood.charAt(0).toUpperCase() + rawMood.slice(1) : '';

      cards.push({
        title: moodLabel ? `Overcoming feeling ${moodLabel}` : 'Past Lesson Learned',
        action: 'View what you learned',
        bg: colors.light.pastelPurple,
        iconColor: '#7C3AED',
        actionColor: 'rgba(124,58,237,0.85)',
        icon: 'shield-checkmark-outline' as const,
        onPress: () => setShowMemoryModal(true),
      });
    } else {
      cards.push({
        title: 'Past Resilience',
        action: 'Builds as you reflect',
        bg: 'rgba(61,61,61,0.05)',
        iconColor: 'rgba(61,61,61,0.6)',
        actionColor: 'rgba(61,61,61,0.8)',
        icon: 'sparkles-outline' as const,
        onPress: () => setShowMemoryModal(true),
      });
    }

    // Card 2: Grounded Insight (Calm perspective, not tough love)
    if (dominantMood) {
      cards.push({
        title: `Navigating feeling ${dominantMood.charAt(0).toUpperCase() + dominantMood.slice(1)}`,
        action: 'View insight',
        bg: colors.light.pastelBlue,
        iconColor: '#2563EB',
        actionColor: 'rgba(37,99,235,0.85)',
        icon: 'leaf-outline' as const,
        onPress: () => {
          setSelectedFocusMood(dominantMood);
          setShowFocusModal(true);
        },
      });
    } else {
      cards.push({
        title: 'Grounded Mind',
        action: 'View insight',
        bg: colors.light.pastelYellow,
        iconColor: '#D97706',
        actionColor: 'rgba(217,119,6,0.85)',
        icon: 'leaf-outline' as const,
        onPress: () => {
          setSelectedFocusMood('balance');
          setShowFocusModal(true);
        },
      });
    }

    return cards;
  }, [pastMemory, dominantMood]);

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

  const handleDeleteEntry = (entryId: string) => {
    Alert.alert(
      "Delete Reflection",
      "Are you sure you want to delete this reflection?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteEntry(entryId);
          },
        },
      ]
    );
  };

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

          {/* Calendar Strip Header with Month & Navigation */}
          <View style={styles.calendarHeaderRow}>
            <View style={styles.weekNavControls}>
              <TouchableOpacity
                onPress={() => setWeekOffset(prev => prev - 1)}
                style={styles.weekNavBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={18} color="rgba(61,61,61,0.6)" />
              </TouchableOpacity>
              
              <Text style={styles.calendarMonthText}>
                {weekDays[3]?.fullDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </Text>

              {/* Disabled when on current week to prevent moving forward in time */}
              <TouchableOpacity
                disabled={weekOffset >= 0}
                onPress={() => setWeekOffset(prev => prev + 1)}
                style={[styles.weekNavBtn, weekOffset >= 0 && { opacity: 0.25 }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-forward" size={18} color="rgba(61,61,61,0.6)" />
              </TouchableOpacity>
            </View>

            {!isViewingToday && (
              <TouchableOpacity
                style={styles.backToTodayBtn}
                onPress={() => {
                  setSelectedDate(new Date());
                  setWeekOffset(0);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-undo" size={13} color={colors.light.text} />
                <Text style={styles.backToTodayBtnText}>Back to Today</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Interactive Weekly Days */}
          <View style={styles.calendarStrip}>
            {weekDays.map((day: any, index: number) => {
              const isSelected = day.fullDate.toDateString() === selectedDate.toDateString();
              const isFuture = isFutureDay(day.fullDate);
              const hasEntries = entries.some(
                e => new Date(e.created_at).toDateString() === day.fullDate.toDateString()
              );

              return (
                <TouchableOpacity
                  key={index}
                  disabled={isFuture}
                  style={[styles.calendarDay, isFuture && { opacity: 0.25 }]}
                  onPress={() => setSelectedDate(day.fullDate)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.calendarDayLabel,
                    isSelected && styles.calendarDayLabelSelected,
                    day.isToday && !isSelected && { color: colors.light.accent, fontWeight: '700' },
                  ]}>
                    {day.label}
                  </Text>
                  
                  {/* Lavender Signature Bubble for selected day */}
                  <View style={[
                    styles.calendarDateCircle,
                    isSelected && styles.calendarDateSelected,
                    day.isToday && !isSelected && styles.calendarDateToday,
                  ]}>
                    <Text style={[
                      styles.calendarDateText,
                      isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      day.isToday && !isSelected && { color: colors.light.accent, fontWeight: '700' },
                    ]}>
                      {day.date}
                    </Text>
                  </View>

                  {/* Indicator Dot for entries on this day */}
                  {hasEntries ? (
                    <View style={[styles.dayEntryDot, isSelected && styles.dayEntryDotSelected]} />
                  ) : (
                    <View style={styles.dayEntryDotEmpty} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Date Context Banner if viewing a past date */}
        {!isViewingToday && (
          <View style={styles.viewingDateBanner}>
            <Ionicons name="calendar-outline" size={15} color={colors.light.accent} />
            <Text style={styles.viewingDateText}>
              Viewing {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>
        )}

        {/* Primary Action: Check In (shown when viewing today) */}
        {isViewingToday && (
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
        )}

        {/* FOR YOU Section (2-column cards + big analysis card) */}
        <View style={styles.forYouSection}>
          <View style={styles.forYouHeader}>
            <Text style={styles.forYouLabel}>FOR YOU</Text>
            <Text style={styles.forYouSub}>Daily focus areas and memories to ground your day.</Text>
          </View>

          {/* 2-Column Pastel Cards (Memory Recall & Grounded Insight) */}
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
                <Text style={styles.pastelCardTitle} numberOfLines={3}>{card.title}</Text>
                <View style={styles.pastelCardAction}>
                  <Text style={[styles.pastelCardActionText, { color: card.actionColor }]}>
                    {card.action}
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={card.actionColor} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Big Full Analysis Card: Recurring Pattern Alert or Temporal Map */}
          {latestPattern ? (
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
          ) : (
            <TouchableOpacity
              style={styles.temporalCard}
              activeOpacity={0.8}
              onPress={() => router.push('/profile' as any)}
            >
              <View style={styles.temporalContent}>
                <View>
                  <Text style={styles.temporalTitle}>Temporal Map</Text>
                  <Text style={styles.temporalLabel}>VIEW 7-DAY INSIGHTS</Text>
                </View>
                <View style={styles.temporalIcon}>
                  <Ionicons name="bar-chart-outline" size={24} color="#3B82F6" />
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ══════════ DAY'S JOURNAL ENTRIES SECTION ══════════ */}
        <View style={styles.journalSection}>
          <View style={styles.journalSectionHeader}>
            <Text style={styles.journalSectionLabel}>
              {isViewingToday
                ? "TODAY'S JOURNAL"
                : `JOURNAL ARCHIVE · ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}`}
            </Text>
            <Text style={styles.journalSectionCount}>
              {entriesOnSelectedDate.length} {entriesOnSelectedDate.length === 1 ? 'reflection' : 'reflections'}
            </Text>
          </View>

          {entriesOnSelectedDate.length > 0 ? (
            <View style={styles.journalList}>
              {entriesOnSelectedDate.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onPress={() => {}}
                  onEdit={() => router.push(`/journal/edit/${entry.id}` as any)}
                  onViewLesson={() => router.push(`/journal/lesson/${entry.id}` as any)}
                  onDelete={() => handleDeleteEntry(entry.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyJournalCard}>
              <View style={styles.emptyJournalIcon}>
                <Ionicons name="book-outline" size={28} color="rgba(61,61,61,0.35)" />
              </View>
              <Text style={styles.emptyJournalTitle}>
                {isViewingToday ? 'No reflections recorded today' : 'No reflections on this day'}
              </Text>
              <Text style={styles.emptyJournalSub}>
                {isViewingToday
                  ? 'Take a quiet moment to record what is on your mind.'
                  : `You didn't write any reflections on ${selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.`}
              </Text>
              {isViewingToday && (
                <TouchableOpacity
                  style={styles.emptyJournalActionBtn}
                  onPress={() => router.push('/journal/emotions' as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color={colors.light.background} />
                  <Text style={styles.emptyJournalActionBtnText}>Record Reflection</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Past Resilience & Lesson Modal */}
      <Modal
        visible={showMemoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMemoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMemoryModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.light.text} />
            </TouchableOpacity>

            <View style={[styles.modalIconBox, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
              <Ionicons name="shield-checkmark-outline" size={32} color="#7C3AED" />
            </View>

            <Text style={[styles.modalLabel, { color: '#7C3AED' }]}>PAST RESILIENCE</Text>
            
            {pastMemory ? (
              <>
                <Text style={styles.modalSubtitle}>
                  {pastMemory.mood 
                    ? `When you moved past feeling ${pastMemory.mood.split(',')[0].replace(/[\u1000-\uFFFF]+/g, '').trim()}`
                    : (pastMemory.title || 'A Moment You Overcame')}
                </Text>
                <Text style={styles.memoryModalDate}>
                  Recorded on {formatDate(pastMemory.created_at)}
                </Text>

                <View style={styles.lessonCalloutBox}>
                  <Text style={styles.lessonCalloutLabel}>THE LESSON YOU LEARNED</Text>
                  <Text style={styles.lessonCalloutText}>
                    "{pastResilienceLesson || 'Notice what drained you versus what gave you peace, and let go of what was never yours to carry.'}"
                  </Text>
                </View>

                <View style={styles.memorySnippetBox}>
                  <Text style={styles.memorySnippetLabel}>YOUR THOUGHTS AT THE TIME</Text>
                  <Text style={styles.memorySnippetText} numberOfLines={3}>
                    {pastMemory.content}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: colors.light.accent, marginBottom: 12 }]}
                  onPress={() => {
                    setShowMemoryModal(false);
                    router.push(`/journal/lesson/${pastMemory.id}` as any);
                  }}
                >
                  <Text style={[styles.modalActionButtonText, { color: '#FFFFFF' }]}>View Full Lesson</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>Past Resilience</Text>
                <Text style={styles.modalBodyText}>
                  As you check in and record reflections, lessons from moments you navigated and overcame will appear here to remind you of your strength.
                </Text>
              </>
            )}

            <TouchableOpacity
              style={[styles.modalActionButton, { backgroundColor: 'rgba(61,61,61,0.06)' }]}
              onPress={() => setShowMemoryModal(false)}
            >
              <Text style={[styles.modalActionButtonText, { color: colors.light.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

            <View style={[styles.modalIconBox, { backgroundColor: 'rgba(37,99,235,0.1)' }]}>
              <Ionicons name="leaf-outline" size={32} color="#2563EB" />
            </View>

            <Text style={[styles.modalLabel, { color: '#2563EB' }]}>
              {selectedFocusMood && selectedFocusMood !== 'balance' ? `PERSPECTIVE ON ${selectedFocusMood.toUpperCase()}` : 'GROUNDING THOUGHT'}
            </Text>
            <Text style={styles.modalSubtitle}>A moment of clarity</Text>

            {loadingStrategy ? (
              <View style={{ height: 100, justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.light.accent} />
              </View>
            ) : (
              <Text style={styles.modalBodyText}>
                {focusStrategy || "Take a slow breath. Notice what is within your control right now, and let the rest wait."}
              </Text>
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
            <ScrollView style={{ maxHeight: 300, marginBottom: 24 }} showsVerticalScrollIndicator={false}>
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
    marginBottom: 24,
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

  // Calendar Strip Header
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekNavControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekNavBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(61,61,61,0.05)',
  },
  calendarMonthText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text,
  },
  backToTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.light.primary, // Soft light blue
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...shadows.sm,
  },
  backToTodayBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.text,
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
    minWidth: 38,
  },
  calendarDayLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    color: 'rgba(61,61,61,0.5)',
  },
  calendarDayLabelSelected: {
    fontWeight: '700',
    color: colors.light.text,
  },
  calendarDateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  // Signature Lavender Purple for selected day
  calendarDateSelected: {
    backgroundColor: colors.light.accent,
    ...shadows.sm,
  },
  calendarDateToday: {
    borderWidth: 1.5,
    borderColor: colors.light.accent,
    backgroundColor: 'rgba(184, 161, 209, 0.12)',
  },
  calendarDateText: {
    fontSize: 13,
    color: colors.light.text,
    fontWeight: '500',
  },
  dayEntryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.light.accent,
    marginTop: 4,
  },
  dayEntryDotSelected: {
    backgroundColor: colors.light.accent,
  },
  dayEntryDotEmpty: {
    width: 4,
    height: 4,
    marginTop: 4,
  },

  // Viewing archive banner
  viewingDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(184, 161, 209, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.lg,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(184, 161, 209, 0.25)',
  },
  viewingDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.text,
  },

  // Check In
  checkInSection: {
    marginBottom: 28,
  },
  checkInTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 12,
  },
  checkInWrapper: {
    backgroundColor: 'rgba(61,61,61,0.05)',
    padding: 6,
    borderRadius: borderRadius.xxl,
  },
  checkInButton: {
    backgroundColor: colors.light.primary,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: borderRadius.xl,
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
    marginBottom: 28,
  },
  forYouHeader: {
    marginBottom: 16,
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
    marginBottom: 16,
  },
  pastelCard: {
    flex: 1,
    padding: 22,
    borderRadius: borderRadius.xxxl,
    aspectRatio: 4 / 5,
    justifyContent: 'flex-start',
  },
  pastelCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pastelCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.light.text,
    lineHeight: 22,
    marginBottom: 12,
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
    backgroundColor: 'rgba(255,224,178,0.4)',
    padding: 22,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  patternIcon: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
  },
  patternTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: colors.light.text,
  },
  patternDesc: {
    fontSize: 14,
    color: 'rgba(61,61,61,0.8)',
    lineHeight: 22,
    marginBottom: 14,
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
    padding: 22,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(61,61,61,0.05)',
    ...shadows.sm,
  },
  temporalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  temporalTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
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

  // Day's Journal Entries Section
  journalSection: {
    marginTop: 8,
    marginBottom: 40,
  },
  journalSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  journalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  journalSectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.accent,
  },
  journalList: {
    gap: 16,
  },
  emptyJournalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xxl,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(61,61,61,0.06)',
    ...shadows.sm,
  },
  emptyJournalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(61,61,61,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyJournalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 6,
  },
  emptyJournalSub: {
    fontSize: 13,
    color: 'rgba(61,61,61,0.6)',
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  emptyJournalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.light.text,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  emptyJournalActionBtnText: {
    color: colors.light.background,
    fontSize: 14,
    fontWeight: '600',
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
    padding: 28,
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.light.text,
    marginBottom: 8,
  },
  memoryModalDate: {
    fontSize: 13,
    color: 'rgba(61,61,61,0.5)',
    marginBottom: 16,
  },
  modalBodyText: {
    fontSize: 15,
    color: 'rgba(61,61,61,0.85)',
    lineHeight: 23,
    marginBottom: 24,
  },
  modalActionButton: {
    backgroundColor: colors.light.primary,
    paddingVertical: 15,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalActionButtonText: {
    color: colors.light.text,
    fontSize: 15,
    fontWeight: '600',
  },
  modalIconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(234,88,12,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalPatternTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.light.text,
    marginBottom: 14,
  },
  lessonCalloutBox: {
    backgroundColor: 'rgba(184, 161, 209, 0.15)',
    borderRadius: borderRadius.lg,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.light.accent,
    marginBottom: 16,
  },
  lessonCalloutLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.light.accent,
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  lessonCalloutText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: colors.light.text,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  memorySnippetBox: {
    backgroundColor: 'rgba(61,61,61,0.04)',
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 20,
  },
  memorySnippetLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.5)',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  memorySnippetText: {
    fontSize: 13,
    color: 'rgba(61,61,61,0.7)',
    lineHeight: 18,
  },
});
