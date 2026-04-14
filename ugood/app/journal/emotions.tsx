import React, { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, borderRadius, shadows } from '../../utils/theme';
import { supabase } from '../../services/supabase';

// Initial predefined tags
const initialTags = [
  { id: '1', label: 'annoyed', defaultDark: false },
  { id: '2', label: 'anxious', defaultDark: false },
  { id: '3', label: 'fearful', defaultDark: false },
  { id: '4', label: 'depressed', defaultDark: false },
  { id: '5', label: 'sad', defaultDark: false },
  { id: '6', label: 'lonely', defaultDark: false },
  { id: '7', label: 'guilty', defaultDark: false },
  { id: '8', label: 'shame', defaultDark: false },
  { id: '9', label: 'angry', defaultDark: false },
  { id: '10', label: 'tired', defaultDark: true },
  { id: '11', label: 'bored', defaultDark: false },
  { id: '12', label: 'calm', defaultDark: false },
  { id: '13', label: 'unmotivated', defaultDark: true, wide: true },
  { id: '14', label: 'relaxed', defaultDark: false },
  { id: '15', label: 'productive', defaultDark: false },
  { id: '16', label: 'content', defaultDark: false },
  { id: '17', label: 'grateful', defaultDark: false },
  { id: '18', label: 'confident', defaultDark: false },
  { id: '19', label: 'proud', defaultDark: false },
  { id: '20', label: 'love', defaultDark: false },
  { id: '21', label: 'happy', defaultDark: false },
];

export default function EmotionsModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tags, setTags] = useState(initialTags);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customEmotion, setCustomEmotion] = useState('');

  const toggleTag = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  }, []);
  useEffect(() => {
    const loadCustomTags = async () => {
      try {
        let customTagsParsed = [];
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.user_metadata?.customEmotions) {
          customTagsParsed = user.user_metadata.customEmotions;
        } else {
          // Fallback to local storage
          const stored = await AsyncStorage.getItem('CUSTOM_EMOTIONS');
          if (stored) {
            customTagsParsed = JSON.parse(stored);
            // Migrate to Supabase
            if (user) {
              await supabase.auth.updateUser({
                data: { customEmotions: customTagsParsed }
              });
            }
          }
        }

        if (customTagsParsed.length > 0) {
          // Filter out tags that might already exist in initialTags to prevent key conflicts
          const existingIds = new Set(initialTags.map(t => t.id));
          const safeTags = customTagsParsed.filter((t: any) => !existingIds.has(t.id));
          setTags((prev) => [...prev, ...safeTags]);
        }
      } catch (error) {
        console.error('Error loading custom emotions:', error);
      }
    };
    loadCustomTags();
  }, []);

  const handleAddCustom = async () => {
    if (!customEmotion.trim()) {
      setIsAddingCustom(false);
      return;
    }
    const newId = `custom_${Date.now()}`;
    const newTag = { id: newId, label: customEmotion.trim().toLowerCase(), defaultDark: false };

    const updatedTags = [...tags, newTag];
    setTags(updatedTags);

    try {
      const customTags = updatedTags.filter(t => t.id.startsWith('custom_'));
      
      // Save locally first for instant load next time
      await AsyncStorage.setItem('CUSTOM_EMOTIONS', JSON.stringify(customTags));
      
      // Sync permanently to Supabase User Metadata
      await supabase.auth.updateUser({
         data: { customEmotions: customTags }
      });
    } catch (error) {
      console.error('Error saving custom emotion:', error);
    }

    // Auto select it using the new boolean logic
    setSelectedIds((prev) => ({
      ...prev,
      [newId]: true
    }));

    setCustomEmotion('');
    setIsAddingCustom(false);
  };

  const handleNext = () => {
    // Extract labels of selected emotions to pass to the next screen
    const selectedEmotions = tags
      .filter(t => selectedIds[t.id])
      .map(t => t.label);

    router.push({
      pathname: '/journal/new',
      params: { emotions: JSON.stringify(selectedEmotions) },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header Area */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}>

        {/* Instagram-style Progress Bars */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, styles.progressActive]} />
          <View style={styles.progressBar} />
        </View>

        {/* Close Button 'X' */}
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="close" size={32} color="rgba(61,61,61,0.7)" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>What emotions do you feel right now?</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tagGrid}>
          {tags.map((tag) => {
            const isSelected = !!selectedIds[tag.id];

            return (
              <TouchableOpacity
                key={tag.id}
                activeOpacity={0.7}
                onPress={() => toggleTag(tag.id)}
                style={[
                  styles.tag,
                  tag.wide && styles.tagWide,
                  isSelected ? styles.tagDark : styles.tagLight,
                ]}
              >
                <Text style={[
                  styles.tagText,
                  isSelected ? { color: '#FFFFFF' } : { color: colors.light.text }
                ]}>
                  {tag.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Add Custom Button / Input */}
          {isAddingCustom ? (
            <View style={[styles.tag, styles.tagWide, styles.tagLight, { paddingVertical: 0 }]}>
              <TextInput
                style={styles.customInput}
                autoFocus
                value={customEmotion}
                onChangeText={setCustomEmotion}
                onSubmitEditing={handleAddCustom}
                onBlur={handleAddCustom}
                placeholder="type..."
                placeholderTextColor="rgba(61,61,61,0.4)"
                returnKeyType="done"
              />
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsAddingCustom(true)}
              style={[styles.tag, styles.tagLight, styles.addTag]}
            >
              <Ionicons name="add" size={20} color={colors.light.text} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Fixed Bottom Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity
          style={styles.nextButton}
          activeOpacity={0.8}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>next</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background, // #F5F2EA
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(61,61,61,0.1)',
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: colors.light.text,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.light.text, // #3D3D3D
    textAlign: 'center',
    lineHeight: 40,
    maxWidth: 280,
    alignSelf: 'center',
    // Playfair Display
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 140, // Space for fixed footer
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: borderRadius.lg, // 8px
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagWide: {
    minWidth: '60%',
  },
  tagLight: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderColor: 'rgba(61,61,61,0.1)',
  },
  tagDark: {
    backgroundColor: colors.light.text,
  },
  addTag: {
    paddingHorizontal: 20,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  customInput: {
    height: 42,
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
    textAlign: 'center',
    width: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(245,242,234,0.95)', // wellness-bg
    paddingHorizontal: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(61,61,61,0.05)',
  },
  nextButton: {
    backgroundColor: colors.light.text,
    width: '100%',
    paddingVertical: 18,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
});
