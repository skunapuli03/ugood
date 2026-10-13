import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../../store/userStore';
import { useJournalStore } from '../../store/journalStore';
import EntryCard from '../../components/EntryCard';
import GradientHeader from '../../components/GradientHeader';
import { colors, gradients } from '../../utils/theme';

export default function JournalFeedScreen() {
  const router = useRouter();
  const { user } = useUserStore();
  const { entries, loading, fetchEntries } = useJournalStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (user) {
      fetchEntries(user.id);
    }
  }, [user]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (user) {
      await fetchEntries(user.id);
    }
    setRefreshing(false);
  }, [user, fetchEntries]);

  return (
    <View style={styles.container}>
      <GradientHeader
        title="All Entries"
        subtitle={`${entries.length} total entries`}
        gradient={gradients.secondary}
      />

      {loading && entries.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No entries yet</Text>
          <Text style={styles.emptySubtext}>Start your journaling journey!</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
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
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  listContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.light.textSecondary,
  },
});


