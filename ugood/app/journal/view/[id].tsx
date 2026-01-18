import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useJournalStore } from '../../../store/journalStore';
import GradientHeader from '../../../components/GradientHeader';
import { colors, gradients, borderRadius, shadows } from '../../../utils/theme';
import { formatDateTime } from '../../../utils/format';

export default function ViewEntryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getEntry, deleteEntry } = useJournalStore();
  const [entry, setEntry] = useState(getEntry(id || ''));

  useEffect(() => {
    if (id) {
      const foundEntry = getEntry(id);
      if (!foundEntry) {
        Alert.alert('Error', 'Entry not found');
        router.back();
      } else {
        setEntry(foundEntry);
      }
    }
  }, [id]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              const success = await deleteEntry(id);
              if (success) {
                router.back();
              } else {
                Alert.alert('Error', 'Failed to delete entry');
              }
            }
          },
        },
      ]
    );
  };

  if (!entry) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <GradientHeader
        title="Journal Entry"
        subtitle={formatDateTime(entry.created_at)}
        gradient={gradients.cool}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{entry.title || 'Untitled Entry'}</Text>
          <Text style={styles.date}>{formatDateTime(entry.created_at)}</Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.text}>{entry.content}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/journal/lesson/${entry.id}`)}
          >
            <LinearGradient
              colors={gradients.primary as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <Ionicons name="bulb" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>View Lesson</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push(`/journal/edit/${entry.id}`)}
            >
              <Ionicons name="create-outline" size={20} color={colors.light.primary} />
              <Text style={styles.secondaryButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={[styles.secondaryButtonText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
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
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
  textContainer: {
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: 20,
    marginBottom: 24,
    ...shadows.sm,
  },
  text: {
    fontSize: 16,
    color: colors.light.text,
    lineHeight: 26,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  actionGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  deleteButton: {
    borderColor: '#EF4444',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.primary,
  },
  deleteText: {
    color: '#EF4444',
  },
});
