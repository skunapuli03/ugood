import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '../../store/notificationStore';
import { colors, borderRadius, shadows } from '../../utils/theme';

export default function PatternsHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notifications } = useNotificationStore();

  const patternHistory = useMemo(() => {
    return notifications.filter(n => n.type === 'past_self');
  }, [notifications]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Past Patterns</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {patternHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={48} color="rgba(61,61,61,0.2)" />
            <Text style={styles.emptyText}>No patterns have been identified yet.</Text>
          </View>
        ) : (
          patternHistory.map((insight, index) => (
            <View 
              key={insight.id} 
              style={[
                styles.card, 
                { backgroundColor: 'rgba(61,61,61,0.03)', marginBottom: 16 },
              ]}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Pattern Analysis</Text>
                  <Text style={styles.cardLabel}>
                    {new Date(insight.created_at).toLocaleDateString(undefined, { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
                <View style={[styles.cardIconBadge, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                  <Ionicons name="sparkles-outline" size={20} color="rgba(61,61,61,0.4)" />
                </View>
              </View>
              <Text style={styles.aiInsightText}>
                {insight.content}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.light.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 24, 
    paddingBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(61,61,61,0.05)' 
  },
  backButton: { 
    padding: 4 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: colors.light.text 
  },
  scrollContent: { 
    padding: 24,
    paddingBottom: 60,
  },
  emptyState: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 80 
  },
  emptyText: { 
    fontSize: 16, 
    color: 'rgba(61,61,61,0.5)', 
    marginTop: 16 
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: borderRadius.xxl,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.5)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cardIconBadge: {
    padding: 10,
    backgroundColor: 'rgba(184,161,209,0.1)',
    borderRadius: borderRadius.lg,
  },
  aiInsightText: {
    fontSize: 15,
    color: 'rgba(61,61,61,0.8)',
    lineHeight: 24,
    fontStyle: 'italic',
  },
});
