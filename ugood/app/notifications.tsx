import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../utils/theme';
import { useNotificationStore, NotificationType } from '../store/notificationStore';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notifications, markAsRead } = useNotificationStore();
  const [selectedNotification, setSelectedNotification] = React.useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = React.useState(false);

  const handlePress = (notification: any) => {
    markAsRead(notification.id);
    setSelectedNotification(notification);
    setShowDetailModal(true);
  };

  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'past_self':
        return { icon: 'sparkles-outline', bg: 'rgba(37,99,235,0.1)', fg: colors.light.primary };
      case 'system':
      default:
        return { icon: 'time-outline', bg: 'rgba(37,99,235,0.05)', fg: colors.light.primary };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 40) }]}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="rgba(61,61,61,0.2)" />
            <Text style={styles.emptyText}>You're all caught up!</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {notifications.map((notification) => {
              const styleProps = getNotificationStyle(notification.type);

              return (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.read && styles.unreadCard
                  ]}
                  onPress={() => handlePress(notification)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBadge, { backgroundColor: styleProps.bg }]}>
                    <Ionicons name={styleProps.icon as any} size={20} color={styleProps.fg} />
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, !notification.read && styles.unreadText]}>
                      {notification.title || 'New Insight'}
                    </Text>
                    <Text style={styles.cardBody} numberOfLines={2}>
                      {notification.content}
                    </Text>
                    <Text style={styles.timeText}>
                      {new Date(notification.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  {!notification.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowDetailModal(false)}>
              <Ionicons name="close" size={24} color={colors.light.text} />
            </TouchableOpacity>

            <View style={styles.modalIconBox}>
              <Ionicons
                name={selectedNotification ? getNotificationStyle(selectedNotification.type).icon as any : 'sparkles-outline'}
                size={32}
                color={colors.light.primary}
              />
            </View>

            <Text style={styles.modalTitle}>{selectedNotification?.title || 'New Insight'}</Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalBodyText}>{selectedNotification?.content}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(61,61,61,0.05)' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.light.text },
  scrollContent: { padding: 24 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: 'rgba(61,61,61,0.5)', marginTop: 16 },
  listContainer: { gap: 12 },
  notificationCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: borderRadius.xxl, padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  unreadCard: { backgroundColor: '#FFFFFF', borderColor: 'rgba(37,99,235,0.3)' },
  iconBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardContent: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.light.text, marginBottom: 2 },
  unreadText: { fontWeight: '700' },
  cardBody: { fontSize: 14, color: 'rgba(61,61,61,0.7)', lineHeight: 20 },
  timeText: { fontSize: 11, color: 'rgba(61,61,61,0.4)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.light.primary, alignSelf: 'center', marginLeft: 8 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: colors.light.surface, borderRadius: borderRadius.xxxl, padding: 32, width: '100%', position: 'relative', ...shadows.lg },
  modalCloseButton: { position: 'absolute', top: 20, right: 20, padding: 8, zIndex: 10 },
  modalIconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(37,99,235,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.light.text, marginBottom: 16 },
  modalBodyText: { fontSize: 16, color: colors.light.textSecondary, lineHeight: 26, marginBottom: 24 },
});
