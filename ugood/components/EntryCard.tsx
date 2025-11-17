import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDate } from '../utils/format';
import { colors, borderRadius, shadows } from '../utils/theme';
import ThreeDotMenu from './ThreeDotMenu';

interface EntryCardProps {
  entry: {
    id: string;
    content: string;
    mood: string;
    created_at: string;
  };
  onPress: () => void;
  onEdit: () => void;
  onViewLesson: () => void;
  onDelete: () => void;
}

export default function EntryCard({
  entry,
  onPress,
  onEdit,
  onViewLesson,
  onDelete,
}: EntryCardProps) {
  // Extract title and preview from content
  const parts = entry.content.split('\n\n');
  const title = parts[0] || 'Untitled Entry';
  const bodyContent = parts.length > 1 ? parts.slice(1).join(' ') : entry.content;
  const preview = bodyContent.length > 100
    ? bodyContent.substring(0, 100) + '...'
    : bodyContent;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
        <ThreeDotMenu
          onEdit={onEdit}
          onViewLesson={onViewLesson}
          onDelete={onDelete}
        />
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.preview} numberOfLines={3}>{preview}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 8,
  },
  preview: {
    fontSize: 15,
    color: colors.light.text,
    lineHeight: 22,
  },
});


