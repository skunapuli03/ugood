import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useJournalStore } from '../../store/journalStore';
import EntryCard from '../../components/EntryCard';
import { colors, borderRadius, shadows } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function JournalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const { entries, loading, fetchEntries } = useJournalStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) fetchEntries(user.id);
  }, [user]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (user) await fetchEntries(user.id);
    setRefreshing(false);
  }, [user, fetchEntries]);

  const filteredEntries = React.useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.content?.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const header = (
    <View style={[styles.headerSection, { paddingTop: insets.top + 16 }]}>
      {/* Serif Title */}
      <Text style={styles.title}>Journals</Text>
      <Text style={styles.subtitle}>{entries.length} entries</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="rgba(61,61,61,0.4)" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search entries..."
          placeholderTextColor="rgba(61,61,61,0.3)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="rgba(61,61,61,0.3)" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading && entries.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.light.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={56} color="rgba(61,61,61,0.2)" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No matching entries' : 'No entries yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search' : 'Start your journaling journey!'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background, // #F5F2EA
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.light.text, // #3D3D3D
    marginBottom: 4,
    // Playfair Display
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.5)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: borderRadius.xl,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.light.text,
  },
  listContent: {
    paddingBottom: 120,
  },
  cardWrapper: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(61,61,61,0.5)',
    textAlign: 'center',
  },
});
