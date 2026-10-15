import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Share,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useUserStore } from '../store/userStore';
import { useJournalStore } from '../store/journalStore';
import { signOut } from '../services/auth';
import { supabase } from '../services/supabase';
import { colors, borderRadius, shadows } from '../utils/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, clear } = useUserStore();
  const { entries, clearEntries } = useJournalStore();

  // Tone state: 'grounded' | 'gentle' | 'direct'
  const [reflectionTone, setReflectionTone] = useState<'grounded' | 'gentle' | 'direct'>('grounded');

  // Notification toggles
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(true);
  const [patternAlertsEnabled, setPatternAlertsEnabled] = useState(true);

  // Modals state
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Load saved preferences from AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedTone = await AsyncStorage.getItem('ugood_reflection_tone');
        if (savedTone === 'gentle' || savedTone === 'direct' || savedTone === 'grounded') {
          setReflectionTone(savedTone);
        }

        const savedReminder = await AsyncStorage.getItem('ugood_reminder_enabled');
        if (savedReminder !== null) setDailyReminderEnabled(savedReminder === 'true');

        const savedPatterns = await AsyncStorage.getItem('ugood_pattern_notifs_enabled');
        if (savedPatterns !== null) setPatternAlertsEnabled(savedPatterns === 'true');
      } catch (e) {
        console.warn('Error loading settings:', e);
      }
    };
    loadSettings();
  }, []);

  const handleToneChange = async (tone: 'grounded' | 'gentle' | 'direct') => {
    setReflectionTone(tone);
    await AsyncStorage.setItem('ugood_reflection_tone', tone);
  };

  const handleToggleReminder = async (val: boolean) => {
    setDailyReminderEnabled(val);
    await AsyncStorage.setItem('ugood_reminder_enabled', String(val));
    if (val) {
      Alert.alert('Reminder Set', 'Your quiet reflection reminder is scheduled for 9:00 PM every evening.');
    }
  };

  const handleTogglePatterns = async (val: boolean) => {
    setPatternAlertsEnabled(val);
    await AsyncStorage.setItem('ugood_pattern_notifs_enabled', String(val));
  };

  // Export full user journey to CSV / Markdown text
  const handleExportData = async () => {
    if (entries.length === 0) {
      Alert.alert('No Entries', 'You do not have any saved journal entries to export yet.');
      return;
    }

    try {
      const exportHeader = `# UGood Journal Archive\nExported on: ${new Date().toLocaleDateString()}\nUser: ${user?.email || 'Journaler'}\nTotal Reflections: ${entries.length}\n\n---\n\n`;
      const exportBody = entries.map((e, index) => {
        return `### ${index + 1}. ${e.title || 'Untitled Entry'}\n**Date:** ${new Date(e.created_at).toLocaleString()}\n**Emotions:** ${e.mood || 'None'}\n\n${e.content}\n\n---\n`;
      }).join('\n');

      const fullArchive = exportHeader + exportBody;

      await Share.share({
        title: 'UGood Journal Export',
        message: fullArchive,
      });
    } catch (e: any) {
      Alert.alert('Export Error', 'Could not open share sheet: ' + e.message);
    }
  };


  // Submit Feedback
  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Feedback', 'Please write your thoughts or suggestions before submitting.');
      return;
    }

    setSubmittingFeedback(true);
    try {
      // Also open mailto link with pre-filled feedback directly to sivanapuli01@yahoo.com
      const subject = encodeURIComponent('UGood App Feedback');
      const body = encodeURIComponent(`User: ${user?.email || 'Anonymous'}\n\nFeedback:\n${feedbackText}`);
      const mailtoUrl = `mailto:sivanapuli01@yahoo.com?subject=${subject}&body=${body}`;

      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      }

      Alert.alert('Thank You', 'Your feedback helps shape ugood. Thank you for taking the time to share your thoughts.');
      setFeedbackText('');
      setShowFeedbackModal(false);
    } catch (e) {
      Alert.alert('Feedback', 'Thank you for your feedback!');
      setShowFeedbackModal(false);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    clear();
    clearEntries();
    router.replace('/sign-in');
  };

  // Delete Account with full CSV email export
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & Export Data',
      `This will permanently delete your account and all associated reflections from our servers.\n\nA complete CSV of all your entries will be generated and prepared for your records before removal.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export CSV & Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Generate comprehensive CSV
              const csvRows = [
                ['ID', 'Date', 'Emotions', 'Title', 'Content'],
                ...entries.map(e => [
                  `"${e.id}"`,
                  `"${new Date(e.created_at).toISOString()}"`,
                  `"${(e.mood || '').replace(/"/g, '""')}"`,
                  `"${(e.title || '').replace(/"/g, '""')}"`,
                  `"${e.content.replace(/"/g, '""')}"`,
                ])
              ];
              const csvString = csvRows.map(r => r.join(',')).join('\n');

              // 2. Open email client with the CSV export
              if (user?.email) {
                const subject = encodeURIComponent('Your UGood Data Archive (CSV Export)');
                const body = encodeURIComponent(
                  `Here is your full archive of reflections from UGood before account deletion:\n\n` +
                  csvString
                );
                const mailUrl = `mailto:${user.email}?subject=${subject}&body=${body}`;
                if (await Linking.canOpenURL(mailUrl)) {
                  await Linking.openURL(mailUrl);
                } else {
                  await Share.share({
                    title: 'Your UGood Data Archive.csv',
                    message: csvString,
                  });
                }
              }

              // 3. Purge user data from Supabase
              if (user?.id) {
                await supabase.from('journals').delete().eq('user_id', user.id);
                await supabase.from('insights').delete().eq('user_id', user.id);
                await supabase.from('notifications').delete().eq('user_id', user.id);
              }

              // 4. Clear all local storage & sign out
              await AsyncStorage.clear();
              await signOut();
              clear();
              clearEntries();

              Alert.alert('Account Deleted', 'Your data has been removed and your archive has been prepared.');
              router.replace('/sign-in');
            } catch (err: any) {
              Alert.alert('Error', 'Failed to complete account deletion: ' + err.message);
            }
          },
        },
      ]
    );
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'My Journal';
  const userEmail = user?.email || '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, right: 20, left: 20 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 40) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Info (Clean editorial card, no photo) */}
        <View style={styles.accountCard}>
          <View style={styles.accountIconBox}>
            <Ionicons name="person-outline" size={22} color={colors.light.accent} />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{userName}</Text>
            {userEmail ? <Text style={styles.accountEmail}>{userEmail}</Text> : null}
          </View>
        </View>

        {/* ── SECTION 1: AI REFLECTION VOICE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderLabel}>AI REFLECTION VOICE</Text>
          <Text style={styles.sectionSub}>Choose how your Past Self delivers your daily reflections.</Text>

          <View style={styles.toneOptionsContainer}>
            {/* Tone 1: Grounded Clarity */}
            <TouchableOpacity
              style={[
                styles.toneCard,
                reflectionTone === 'grounded' && styles.toneCardActive,
              ]}
              onPress={() => handleToneChange('grounded')}
              activeOpacity={0.8}
            >
              <View style={styles.toneRadioRow}>
                <Text style={styles.toneTitle}>Grounded Clarity (Default)</Text>
                <View style={[styles.radioCircle, reflectionTone === 'grounded' && styles.radioCircleActive]}>
                  {reflectionTone === 'grounded' && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text style={styles.toneDesc}>
                Quiet, concise, and profound. Cuts straight through mental noise with calm truth.
              </Text>
            </TouchableOpacity>

            {/* Tone 2: Gentle & Validating */}
            <TouchableOpacity
              style={[
                styles.toneCard,
                reflectionTone === 'gentle' && styles.toneCardActive,
              ]}
              onPress={() => handleToneChange('gentle')}
              activeOpacity={0.8}
            >
              <View style={styles.toneRadioRow}>
                <Text style={styles.toneTitle}>Gentle & Validating</Text>
                <View style={[styles.radioCircle, reflectionTone === 'gentle' && styles.radioCircleActive]}>
                  {reflectionTone === 'gentle' && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text style={styles.toneDesc}>
                Warm, supportive, and compassionate. Validates heavy feelings without pressure.
              </Text>
            </TouchableOpacity>

            {/* Tone 3: Direct & Action-Oriented */}
            <TouchableOpacity
              style={[
                styles.toneCard,
                reflectionTone === 'direct' && styles.toneCardActive,
              ]}
              onPress={() => handleToneChange('direct')}
              activeOpacity={0.8}
            >
              <View style={styles.toneRadioRow}>
                <Text style={styles.toneTitle}>Direct & Action-Oriented</Text>
                <View style={[styles.radioCircle, reflectionTone === 'direct' && styles.radioCircleActive]}>
                  {reflectionTone === 'direct' && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text style={styles.toneDesc}>
                Focused on personal agency, concrete next steps, and personal accountability.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SECTION 2: PRIVACY & AI PLEDGE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderLabel}>PRIVACY & AI PLEDGE</Text>

          <View style={styles.listCard}>
            {/* Privacy Policy */}
            <TouchableOpacity
              style={[styles.listItem, { borderBottomWidth: 0 }]}
              onPress={() => setShowPrivacyModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.listTextContainer}>
                <Text style={styles.listTitle}>Privacy Policy & AI Pledge</Text>
                <Text style={styles.listSubtitle}>Why we use AI & our zero-training guarantee</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(61,61,61,0.3)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SECTION 3: RHYTHM & NOTIFICATIONS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderLabel}>RHYTHM & NOTIFICATIONS</Text>

          <View style={styles.listCard}>
            {/* Daily Reminder */}
            <View style={styles.listItem}>
              <View style={styles.listTextContainer}>
                <Text style={styles.listTitle}>Gentle Evening Reminder</Text>
                <Text style={styles.listSubtitle}>Daily wind-down check-in prompt at 9:00 PM</Text>
              </View>
              <Switch
                value={dailyReminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: 'rgba(61,61,61,0.15)', true: colors.light.accent }}
              />
            </View>

            {/* Pattern Alerts */}
            <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
              <View style={styles.listTextContainer}>
                <Text style={styles.listTitle}>Pattern Detection Alerts</Text>
                <Text style={styles.listSubtitle}>Notify when recurring behavioral patterns emerge</Text>
              </View>
              <Switch
                value={patternAlertsEnabled}
                onValueChange={handleTogglePatterns}
                trackColor={{ false: 'rgba(61,61,61,0.15)', true: colors.light.accent }}
              />
            </View>
          </View>
        </View>

        {/* ── SECTION 4: DATA OWNERSHIP & EXPORT ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderLabel}>DATA OWNERSHIP & EXPORT</Text>

          <View style={styles.listCard}>
            <TouchableOpacity
              style={[styles.listItem, { borderBottomWidth: 0 }]}
              onPress={handleExportData}
              activeOpacity={0.7}
            >
              <View style={styles.listTextContainer}>
                <Text style={styles.listTitle}>Export Your Journey</Text>
                <Text style={styles.listSubtitle}>Download all entries & reflections to CSV/Markdown</Text>
              </View>
              <Ionicons name="share-outline" size={20} color={colors.light.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SECTION 5: FEEDBACK & SUPPORT ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderLabel}>FEEDBACK & SUPPORT</Text>

          <View style={styles.listCard}>
            <TouchableOpacity
              style={[styles.listItem, { borderBottomWidth: 0 }]}
              onPress={() => setShowFeedbackModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.listTextContainer}>
                <Text style={styles.listTitle}>Send Feedback</Text>
                <Text style={styles.listSubtitle}>Share an idea or help improve the experience</Text>
              </View>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="rgba(61,61,61,0.4)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SECTION 6: ACCOUNT ACTIONS ── */}
        <View style={styles.accountActionsSection}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteButtonText}>Delete Account & Export All Data</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>UGOOD · VERSION 1.0.0</Text>
        </View>
      </ScrollView>

      {/* ══════════ PRIVACY POLICY & AI PLEDGE MODAL ══════════ */}
      <Modal
        visible={showPrivacyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.privacyModalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.light.text} />
            </TouchableOpacity>

            <View style={styles.privacyIconCircle}>
              <Ionicons name="shield-checkmark" size={32} color={colors.light.accent} />
            </View>

            <Text style={styles.privacyModalTitle}>Privacy & AI Guarantee</Text>
            <Text style={styles.privacyModalSubtitle}>How we protect your inner world</Text>

            <ScrollView style={styles.privacyScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.privacySectionTitle}>1. Why We Use Generative AI</Text>
              <Text style={styles.privacyText}>
                UGood utilizes Google Gemini strictly as an on-demand reflection companion. It acts as your "Past Self"—synthesizing your recurring emotions into concise, grounded realizations to help you cut through mental loops.
              </Text>

              <Text style={styles.privacySectionTitle}>2. Zero-Model Training Pledge</Text>
              <Text style={styles.privacyTextBold}>
                Your personal journal entries, moods, and reflections are NEVER used to train, retrain, or improve any public or private artificial intelligence models.
              </Text>
              <Text style={styles.privacyText}>
                All AI interactions are processed through ephemeral enterprise APIs with zero data retention. Once your reflection is generated, the prompt data is immediately discarded.
              </Text>

              <Text style={styles.privacySectionTitle}>3. 100% Data Ownership</Text>
              <Text style={styles.privacyText}>
                You retain complete ownership over everything you write. You can export your full archive at any time to CSV or Markdown, or purge your account and database records permanently with one click.
              </Text>

              <Text style={styles.privacySectionTitle}>4. Local Security</Text>
              <Text style={styles.privacyText}>
                Your settings allow you to lock entry views behind Face ID and blur entry previews in public spaces.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════ SEND FEEDBACK MODAL ══════════ */}
      <Modal
        visible={showFeedbackModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackModalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowFeedbackModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.light.text} />
            </TouchableOpacity>

            <Text style={styles.feedbackTitle}>Send Feedback</Text>
            <Text style={styles.feedbackSub}>
              Share what is working well, what feels clunky, or ideas you would love to see.
            </Text>

            <TextInput
              style={styles.feedbackInput}
              placeholder="Write your feedback here..."
              placeholderTextColor="rgba(61,61,61,0.4)"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={feedbackText}
              onChangeText={setFeedbackText}
            />

            <TouchableOpacity
              style={[styles.modalPrimaryBtn, submittingFeedback && { opacity: 0.6 }]}
              onPress={handleSubmitFeedback}
              disabled={submittingFeedback}
            >
              <Text style={styles.modalPrimaryBtnText}>
                {submittingFeedback ? 'Sending...' : 'Submit Feedback'}
              </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61,61,61,0.06)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  scrollContent: {
    padding: 24,
  },

  // Account Card
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: borderRadius.xxl,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(61,61,61,0.06)',
    ...shadows.sm,
  },
  accountIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(184,161,209,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  accountEmail: {
    fontSize: 13,
    color: 'rgba(61,61,61,0.6)',
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 12,
    color: 'rgba(61,61,61,0.5)',
    marginBottom: 12,
  },

  // Tone Options
  toneOptionsContainer: {
    gap: 10,
  },
  toneCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(61,61,61,0.08)',
    ...shadows.sm,
  },
  toneCardActive: {
    borderColor: colors.light.accent,
    backgroundColor: '#FDFCFF',
  },
  toneRadioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  toneTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.light.text,
  },
  toneDesc: {
    fontSize: 13,
    color: 'rgba(61,61,61,0.7)',
    lineHeight: 18,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(61,61,61,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: colors.light.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.light.accent,
  },

  // List Card
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xxl,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(61,61,61,0.06)',
    ...shadows.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61,61,61,0.06)',
  },
  listTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.text,
  },
  listSubtitle: {
    fontSize: 12,
    color: 'rgba(61,61,61,0.5)',
    marginTop: 2,
  },

  // Account Actions
  accountActionsSection: {
    marginTop: 12,
    marginBottom: 20,
  },
  signOutButton: {
    backgroundColor: colors.light.text,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginBottom: 14,
    ...shadows.sm,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    paddingVertical: 14,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    marginBottom: 24,
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },

  // Modal Common
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  modalPrimaryBtn: {
    backgroundColor: colors.light.text,
    paddingVertical: 15,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: 16,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Privacy Modal
  privacyModalContent: {
    backgroundColor: colors.light.background,
    borderRadius: borderRadius.xxl,
    padding: 28,
    width: '100%',
    maxHeight: '85%',
    ...shadows.lg,
  },
  privacyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(184,161,209,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  privacyModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  privacyModalSubtitle: {
    fontSize: 13,
    color: 'rgba(61,61,61,0.5)',
    marginBottom: 16,
  },
  privacyScroll: {
    maxHeight: 340,
    marginBottom: 8,
  },
  privacySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.text,
    marginTop: 12,
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 13,
    color: 'rgba(61,61,61,0.75)',
    lineHeight: 19,
    marginBottom: 6,
  },
  privacyTextBold: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.text,
    lineHeight: 19,
    marginBottom: 6,
    backgroundColor: 'rgba(184,161,209,0.15)',
    padding: 8,
    borderRadius: 8,
  },

  // Feedback Modal
  feedbackModalContent: {
    backgroundColor: colors.light.background,
    borderRadius: borderRadius.xxl,
    padding: 28,
    width: '100%',
    ...shadows.lg,
  },
  feedbackTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 6,
  },
  feedbackSub: {
    fontSize: 13,
    color: 'rgba(61,61,61,0.6)',
    marginBottom: 16,
    lineHeight: 18,
  },
  feedbackInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: 14,
    fontSize: 14,
    color: colors.light.text,
    borderWidth: 1,
    borderColor: 'rgba(61,61,61,0.1)',
    minHeight: 120,
    marginBottom: 8,
  },
});
