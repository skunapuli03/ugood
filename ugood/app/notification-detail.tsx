import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../utils/theme';
import { formatDateTime } from '../utils/format';

interface NotificationDetailParams {
    title?: string;
    content?: string;
    created_at?: string;
    type?: string;
}

export default function NotificationDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams() as unknown as NotificationDetailParams;

    const { title, content, created_at, type } = params;
    const isPastSelf = type === 'past_self';

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header with close button */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.light.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isPastSelf ? 'Realized Self' : 'System Update'}
                </Text>
                <View style={styles.spacer} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Icon and metadata */}
                <View style={styles.metadataSection}>
                    <View
                        style={[
                            styles.iconContainer,
                            isPastSelf ? styles.pastSelfIcon : styles.systemIcon,
                        ]}
                    >
                        <Ionicons
                            name={isPastSelf ? 'sparkles' : 'megaphone'}
                            size={32}
                            color="#FFFFFF"
                        />
                    </View>
                    <Text style={styles.dateText}>
                        {created_at ? formatDateTime(created_at) : 'Just now'}
                    </Text>
                </View>

                {/* Title and content card */}
                <View style={styles.card}>
                    <Text style={styles.titleText}>{title || 'Note from UGood'}</Text>
                    <Text style={styles.contentText}>{content}</Text>
                </View>
            </ScrollView>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.light.border,
    },
    closeButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.light.text,
    },
    spacer: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
    },
    metadataSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
        ...shadows.md,
    },
    pastSelfIcon: {
        backgroundColor: '#6366f1',
    },
    systemIcon: {
        backgroundColor: '#10B981',
    },
    dateText: {
        fontSize: 14,
        color: colors.light.textSecondary,
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        ...shadows.sm,
        borderWidth: 1,
        borderColor: colors.light.border,
    },
    titleText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.light.text,
        marginBottom: spacing.md,
        lineHeight: 32,
    },
    contentText: {
        fontSize: 16,
        color: colors.light.text,
        lineHeight: 26,
        fontWeight: '400',
    },
});
