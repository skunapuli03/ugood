import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing } from '../utils/theme';

export type MessageRole = 'user' | 'assistant';

interface Props {
    role: MessageRole;
    content: string;
}

export const ChatBubble: React.FC<Props> = ({ role, content }) => {
    const isUser = role === 'user';

    return (
        <View style={[styles.container, isUser ? styles.containerUser : styles.containerAssistant]}>
            <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
                <Text style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}>
                    {content}
                </Text>
            </View>
            {!isUser && (
                <Text style={styles.signature}>— You (Realized)</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    containerUser: {
        alignItems: 'flex-end',
    },
    containerAssistant: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '85%',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    bubbleUser: {
        backgroundColor: '#111827', // Dark slate
        borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
        backgroundColor: '#F3F4F6', // Light gray
        borderBottomLeftRadius: 4,
    },
    text: {
        fontSize: 16,
        lineHeight: 24,
    },
    textUser: {
        color: '#FFFFFF',
    },
    textAssistant: {
        color: '#374151',
    },
    signature: {
        fontSize: 12,
        color: colors.light.primary,
        fontStyle: 'italic',
        marginTop: 4,
        marginLeft: 4,
    },
});
