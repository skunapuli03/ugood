import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useJournalStore } from '../../store/journalStore';
import { colors, borderRadius, shadows } from '../../utils/theme';

export default function NewEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { user } = useUserStore();
  const { createEntry, loading } = useJournalStore();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Parse emotions array from params if it exists
  const emotionsRaw = params.emotions as string;
  const emotions: string[] = emotionsRaw ? JSON.parse(emotionsRaw) : [];
  const isGuidedFlow = emotions.length > 0;

  const handleDone = async () => {
    if (!content.trim() || !user) {
      router.back();
      return;
    }

    const moodString = emotions.join(',');

    // Create entry with the passed emotions
    const entry = await createEntry(
      user.id, 
      title.trim() || 'Untitled Entry', 
      content.trim(),
      moodString
    );
    
    // Instantly close, regardless of success/fail to keep UX fast
    if (isGuidedFlow) {
      // If we came from Home -> Emotions -> New, pop back twice to Home
      router.dismissAll(); 
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header Area */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}>
        
        {/* Progress Bars - show 2 active if guided flow */}
        {isGuidedFlow && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, styles.progressActive]} />
            <View style={[styles.progressBar, styles.progressActive]} />
          </View>
        )}

        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => isGuidedFlow ? router.dismissAll() : router.back()} 
            style={styles.closeButton}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="close" size={32} color="rgba(61,61,61,0.7)" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDone}
            disabled={loading || !content.trim()}
            style={styles.doneButton}
          >
            {loading ? (
              <ActivityIndicator color={colors.light.text} size="small" />
            ) : (
              <Text style={[styles.doneText, (!content.trim()) && styles.doneTextDisabled]}>
                Done
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Editor Area */}
      <View style={styles.editor}>
        <TextInput
          style={styles.titleInput}
          placeholder="New Entry..."
          placeholderTextColor="rgba(61,61,61,0.3)"
          value={title}
          onChangeText={setTitle}
          autoFocus={false}
          returnKeyType="next"
        />

        <TextInput
          style={styles.contentInput}
          placeholder="Start writing..."
          placeholderTextColor="rgba(61,61,61,0.3)"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          autoFocus={true}
        />
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
    marginBottom: 8,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
    marginLeft: -4,
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  doneText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.light.text,
  },
  doneTextDisabled: {
    color: 'rgba(61,61,61,0.3)',
  },
  editor: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleInput: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.light.text,
    marginBottom: 16,
    // Playfair Display style
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(61,61,61,0.9)',
    paddingBottom: 40,
  },
});
