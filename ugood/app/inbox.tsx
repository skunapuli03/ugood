import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';
import { useNotificationStore, Notification } from '../store/notificationStore';
import GradientHeader from '../components/GradientHeader';
import { colors, spacing, borderRadius, shadows, gradients } from '../utils/theme';
import { formatDateTime } from '../utils/format';

export default function InboxScreen() {
    const router = useRouter();
    const { user } = useUserStore();
    const { notifications, loading, fetchNotifications, markAsRead } = useNotificationStore();
    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        if (user) {
            fetchNotifications(user.id);
        }
    }, [user]);

    const onRefresh = async () => {
        if (user) {
            setRefreshing(true);
            await fetchNotifications(user.id);
            setRefreshing(false);
        }
    };

    const handleNotificationPress = async (notification: Notification) => {
        await markAsRead(notification.id);

        if (notification.type === 'past_self') {
            // Route to notification detail screen instead of chat
            router.push({
                pathname: '/notification-detail',
                params: {
                    title: notification.title,
                    content: notification.content,
                    created_at: notification.created_at,
                    type: notification.type
                }
            });
        }
    };

    const renderItem = ({ item }: { item: Notification }) => {
        const isPastSelf = item.type === 'past_self';

        return (
            <TouchableOpacity
                style={[styles.notificationCard, !item.read && styles.unreadCard]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, isPastSelf ? styles.pastSelfIcon : styles.systemIcon]}>
                    <Ionicons
                        name={isPastSelf ? "sparkles" : "megaphone"}
                        size={24}
                        color="#FFFFFF"
                    />
                </View>

                <View style={styles.textContainer}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.typeText}>{isPastSelf ? 'Realized Self' : 'System Update'}</Text>
                        <Text style={styles.dateText}>{formatDateTime(item.created_at)}</Text>
                    </View>
                    <Text style={styles.titleText}>{item.title || 'Note from UGood'}</Text>
                    <Text style={styles.contentText} numberOfLines={2}>
                        {item.content}
                    </Text>
                </View>

                {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <GradientHeader
                        title="Inbox"
                        subtitle="Insights and updates from your journey"
                        gradient={gradients.cool}
                        showBack={true}
                        style={styles.header}
                    />
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="mail-open-outline" size={64} color={colors.light.textSecondary} />
                        <Text style={styles.emptyText}>Your inbox is quiet</Text>
                        <Text style={styles.emptySubtext}>We'll notify you when your past self has new insights.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 40,
    },
    header: {
        marginBottom: spacing.md,
    },
    notificationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        marginHorizontal: spacing.md,
        ...shadows.sm,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    unreadCard: {
        borderColor: colors.light.primary + '33',
        backgroundColor: colors.light.primary + '03',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    pastSelfIcon: {
        backgroundColor: '#6366f1', // Primary indigio
    },
    systemIcon: {
        backgroundColor: '#10B981', // Emerald
    },
    textContainer: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    typeText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.light.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateText: {
        fontSize: 10,
        color: colors.light.textSecondary,
    },
    titleText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.light.text,
        marginBottom: 2,
    },
    contentText: {
        fontSize: 14,
        color: colors.light.textSecondary,
        lineHeight: 20,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.light.primary,
        marginLeft: spacing.sm,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.light.text,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.light.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    },
});
