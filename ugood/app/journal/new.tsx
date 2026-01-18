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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUserStore } from '../../store/userStore';
import { useJournalStore } from '../../store/journalStore';
import { colors } from '../../utils/theme';

export default function NewEntryScreen() {
  const router = useRouter();
  const { user } = useUserStore();
  const { createEntry, loading } = useJournalStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleDone = async () => {
    if (!content.trim()) {
      router.back();
      return;
    }

    if (!user) {
      router.back();
      return;
    }

    const mood = '😊'; // Default mood

    const entry = await createEntry(user.id, title.trim() || 'Untitled Entry', content.trim(), mood);
    if (entry) {
      router.back();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Simple header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Entry</Text>
          <TouchableOpacity
            onPress={handleDone}
            disabled={loading}
            style={styles.doneButton}
          >
            {loading ? (
              <ActivityIndicator color={colors.light.primary} size="small" />
            ) : (
              <Text style={styles.doneText}>Done</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Title input */}
        <TextInput
          style={styles.titleInput}
          placeholder="Title (optional)"
          placeholderTextColor={colors.light.textSecondary}
          value={title}
          onChangeText={setTitle}
          autoFocus={false}
        />

        {/* Content input */}
        <TextInput
          style={styles.contentInput}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.light.textSecondary}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          autoFocus
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 17,
    color: colors.light.primary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.light.text,
  },
  doneButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  doneText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.light.primary,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.light.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  contentInput: {
    flex: 1,
    fontSize: 17,
    color: colors.light.text,
    paddingHorizontal: 16,
    paddingTop: 16,
    lineHeight: 24,
  },
});
