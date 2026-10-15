import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useJournalStore } from '../../store/journalStore';
import { supabase } from '../../services/supabase';
import { colors, borderRadius, shadows, spacing } from '../../utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INITIAL_EMOTIONS = [
  'calm', 'grateful', 'content', 'happy', 'relaxed', 'productive', 'confident',
  'proud', 'love', 'anxious', 'tired', 'sad', 'annoyed', 'fearful', 'depressed',
  'lonely', 'guilty', 'shame', 'angry', 'bored', 'unmotivated'
];

export default function NewEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { user } = useUserStore();
  const { createEntry, loading } = useJournalStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // ── Emotion & Tagging State ──
  const emotionsRaw = params.emotions as string;
  const initialSelected: string[] = emotionsRaw ? JSON.parse(emotionsRaw) : [];
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(initialSelected);
  const [availableTags, setAvailableTags] = useState<string[]>(INITIAL_EMOTIONS);
  const [showTagPicker, setShowTagPicker] = useState<boolean>(false);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [isCreatingTag, setIsCreatingTag] = useState<boolean>(false);

  const isGuidedFlow = initialSelected.length > 0;

  // Load user's saved custom tags
  useEffect(() => {
    const loadCustomTags = async () => {
      try {
        let customTagsList: string[] = [];
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (currentUser?.user_metadata?.customEmotions) {
          const stored = currentUser.user_metadata.customEmotions;
          customTagsList = stored.map((t: any) => t.label || t);
        } else {
          const stored = await AsyncStorage.getItem('CUSTOM_EMOTIONS');
          if (stored) {
            const parsed = JSON.parse(stored);
            customTagsList = parsed.map((t: any) => t.label || t);
          }
        }

        if (customTagsList.length > 0) {
          setAvailableTags(prev => {
            const combined = [...prev];
            customTagsList.forEach(tag => {
              const lower = tag.toLowerCase().trim();
              if (!combined.includes(lower)) {
                combined.push(lower);
              }
            });
            return combined;
          });
        }
      } catch (err) {
        console.error('Error loading custom tags for new entry:', err);
      }
    };

    loadCustomTags();
  }, []);

  // Toggle emotion chip on/off
  const toggleEmotion = (emotion: string) => {
    const lower = emotion.toLowerCase().trim();
    setSelectedEmotions(prev => {
      if (prev.includes(lower)) {
        return prev.filter(e => e !== lower);
      } else {
        return [...prev, lower];
      }
    });
  };

  // Create a brand new custom tag
  const handleCreateNewTag = async () => {
    const trimmed = newTagInput.trim().toLowerCase();
    if (!trimmed) {
      setIsCreatingTag(false);
      return;
    }

    // Add to available tags if not present
    if (!availableTags.includes(trimmed)) {
      setAvailableTags(prev => [trimmed, ...prev]);
    }

    // Auto-select for this current entry
    if (!selectedEmotions.includes(trimmed)) {
      setSelectedEmotions(prev => [...prev, trimmed]);
    }

    // Persist permanently to AsyncStorage and Supabase
    try {
      const stored = await AsyncStorage.getItem('CUSTOM_EMOTIONS');
      let customTags = stored ? JSON.parse(stored) : [];
      if (!customTags.some((t: any) => (t.label || t) === trimmed)) {
        customTags.push({ id: `custom_${Date.now()}`, label: trimmed, defaultDark: false });
        await AsyncStorage.setItem('CUSTOM_EMOTIONS', JSON.stringify(customTags));

        if (user) {
          await supabase.auth.updateUser({
            data: { customEmotions: customTags },
          });
        }
      }
    } catch (e) {
      console.error('Error saving new custom tag:', e);
    }

    setNewTagInput('');
    setIsCreatingTag(false);
  };

  const navigateBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      router.replace('/(tabs)');
    }
  };

  const handleDone = async () => {
    if (!content.trim() || !user) {
      navigateBack();
      return;
    }

    const moodString = selectedEmotions.join(',');

    // Create entry with the selected emotions & tags
    await createEntry(
      user.id,
      title.trim() || 'Untitled Entry',
      content.trim(),
      moodString
    );

    if (isGuidedFlow) {
      router.dismissAll();
    } else {
      navigateBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header Area */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        {isGuidedFlow && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, styles.progressActive]} />
            <View style={[styles.progressBar, styles.progressActive]} />
          </View>
        )}

        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => (isGuidedFlow ? router.dismissAll() : navigateBack())}
            style={styles.closeButton}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Ionicons name="close" size={28} color="rgba(61,61,61,0.7)" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDone}
            disabled={loading || !content.trim()}
            style={[styles.doneButton, (!content.trim() || loading) && styles.doneButtonDisabled]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.light.background} size="small" />
            ) : (
              <Text style={styles.doneText}>Done</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title Input */}
        <TextInput
          style={styles.titleInput}
          placeholder="New Reflection..."
          placeholderTextColor="rgba(61,61,61,0.3)"
          value={title}
          onChangeText={setTitle}
          autoFocus={false}
          returnKeyType="next"
        />

        {/* ══════════ TAGGING & EMOTIONS BAR ══════════ */}
        <View style={styles.tagSection}>
          <View style={styles.tagSectionHeader}>
            <View style={styles.activeTagsRow}>
              {selectedEmotions.map((emotion, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.activeTagPill}
                  onPress={() => toggleEmotion(emotion)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.activeTagText}>#{emotion}</Text>
                  <Ionicons name="close-circle" size={14} color={colors.light.text} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.addTagButton}
                onPress={() => setShowTagPicker(!showTagPicker)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={showTagPicker ? "chevron-up" : "pricetag-outline"}
                  size={14}
                  color={colors.light.accent}
                />
                <Text style={styles.addTagButtonText}>
                  {selectedEmotions.length === 0 ? '+ Add Emotion / Tag' : '+ Tag'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Expandable Tag Selection Drawer */}
          {showTagPicker && (
            <View style={styles.tagDrawer}>
              <View style={styles.tagDrawerHeader}>
                <Text style={styles.tagDrawerTitle}>Select or create emotions</Text>
                
                {!isCreatingTag ? (
                  <TouchableOpacity
                    style={styles.newTagAction}
                    onPress={() => setIsCreatingTag(true)}
                  >
                    <Ionicons name="add" size={16} color={colors.light.accent} />
                    <Text style={styles.newTagActionText}>New Tag</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Inline Custom Tag Input */}
              {isCreatingTag && (
                <View style={styles.createTagInputRow}>
                  <TextInput
                    style={styles.newTagInputField}
                    placeholder="e.g. overwhelmed, relieved..."
                    placeholderTextColor="rgba(61,61,61,0.4)"
                    value={newTagInput}
                    onChangeText={setNewTagInput}
                    autoFocus
                    autoCapitalize="none"
                    onSubmitEditing={handleCreateNewTag}
                  />
                  <TouchableOpacity
                    style={[styles.saveTagBtn, !newTagInput.trim() && { opacity: 0.5 }]}
                    onPress={handleCreateNewTag}
                    disabled={!newTagInput.trim()}
                  >
                    <Text style={styles.saveTagBtnText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelTagBtn}
                    onPress={() => {
                      setNewTagInput('');
                      setIsCreatingTag(false);
                    }}
                  >
                    <Ionicons name="close" size={18} color="rgba(61,61,61,0.5)" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Available Emotion Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {availableTags.map((tag, idx) => {
                  const isSelected = selectedEmotions.includes(tag);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleEmotion(tag)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Content Body */}
        <TextInput
          style={styles.contentInput}
          placeholder="Start writing freely... Your thoughts are safe and private."
          placeholderTextColor="rgba(61,61,61,0.3)"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          autoFocus={!isGuidedFlow}
          scrollEnabled={false}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(61,61,61,0.1)',
  },
  progressActive: {
    backgroundColor: colors.light.accent,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  doneButton: {
    backgroundColor: colors.light.text,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: borderRadius.lg,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  doneButtonDisabled: {
    opacity: 0.35,
  },
  doneText: {
    color: colors.light.background,
    fontSize: 15,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleInput: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    paddingVertical: 12,
    marginBottom: 4,
  },

  // ── Tag Section ──
  tagSection: {
    marginVertical: 10,
  },
  tagSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  activeTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.pastelMint,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.15)',
  },
  activeTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#15803D',
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  addTagButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.accent,
  },

  // ── Tag Drawer ──
  tagDrawer: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: borderRadius.lg,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  tagDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tagDrawerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(61,61,61,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  newTagAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newTagActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.accent,
  },
  createTagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  newTagInputField: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.light.text,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  saveTagBtn: {
    backgroundColor: colors.light.text,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
  },
  saveTagBtnText: {
    color: colors.light.background,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelTagBtn: {
    padding: 6,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  chipSelected: {
    backgroundColor: colors.light.accent,
    borderColor: colors.light.accent,
  },
  chipText: {
    fontSize: 13,
    color: colors.light.text,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  contentInput: {
    fontSize: 17,
    lineHeight: 28,
    color: colors.light.text,
    minHeight: 300,
    paddingTop: 12,
  },
});
