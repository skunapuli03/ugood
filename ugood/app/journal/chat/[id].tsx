import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ChatBubble, MessageRole } from '../../../components/ChatBubble';
import { colors, spacing, borderRadius } from '../../../utils/theme';
import { useJournalStore } from '../../../store/journalStore';
import { generate, isModelLoaded, loadModel } from '../../../services/localLLM';

interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
}

export default function ChatScreen() {
    const { id, context: patternContext } = useLocalSearchParams<{ id: string; context?: string }>();
    const router = useRouter();
    const { getEntry } = useJournalStore();
    const entry = getEntry(id as string);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Initialize chat with context
    useEffect(() => {
        if (id === 'holistic' && patternContext) {
            setMessages([
                {
                    id: 'initial',
                    role: 'assistant',
                    content: `I've been looking at the bigger picture of your journey lately. I noticed this: "${patternContext}". What do you think about that?`,
                },
            ]);
        } else if (entry) {
            setMessages([
                {
                    id: 'initial',
                    role: 'assistant',
                    content: `I've been thinking about your entry regarding "${entry.title || 'today'}". What's on your mind?`,
                },
            ]);
        }
    }, [entry, id, patternContext]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText.trim(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        try {
            if (!isModelLoaded()) {
                await loadModel();
            }

            // Build ChatML context
            let prompt = `<|im_start|>system\nYou are the wiser, realized version of me. `;

            if (id === 'holistic' && patternContext) {
                prompt += `We are discussing a holistic pattern I noticed in my recent life: "${patternContext}". `;
            } else if (entry) {
                const safeContent = entry.content.length > 1000
                    ? entry.content.substring(0, 1000) + '...'
                    : entry.content;
                prompt += `We are discussing my journal entry: "${safeContent}". `;
            }

            prompt += `Provide supportive, concise insight. Limit responses to 2-3 sentences max.<|im_end|>\n`;

            // Append history (only the last 6 messages to prevent context overflow)
            const recentMessages = messages.slice(-6);
            recentMessages.forEach(m => {
                prompt += `<|im_start|>${m.role}\n${m.content}<|im_end|>\n`;
            });
            prompt += `<|im_start|>user\n${userMsg.content}<|im_end|>\n<|im_start|>assistant\n`;

            const response = await generate(prompt);

            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.trim(),
            };

            setMessages((prev) => [...prev, assistantMsg]);
        } catch (e) {
            console.error('Chat error:', e);
            setMessages((prev) => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm having trouble connecting to my thoughts right now. Give me a moment.",
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Conversation</Text>
                <View style={{ width: 40 }} />{/* balance */}
            </View>

            {/* Chat Area */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ChatBubble role={item.role} content={item.content} />}
                contentContainerStyle={styles.chatContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {isTyping && (
                <View style={styles.typingIndicator}>
                    <ActivityIndicator size="small" color={colors.light.primary} />
                    <Text style={styles.typingText}>Realized self is typing...</Text>
                </View>
            )}

            {/* Input Area */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Ask your past self something..."
                    placeholderTextColor="#9CA3AF"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={!inputText.trim() || isTyping}
                >
                    <Ionicons
                        name="send"
                        size={20}
                        color={inputText.trim() ? '#FFFFFF' : '#9CA3AF'}
                    />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: 60, // approximate safe area
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    chatContent: {
        paddingVertical: spacing.md,
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.sm,
        gap: spacing.sm,
    },
    typingText: {
        color: colors.light.textSecondary,
        fontSize: 14,
        fontStyle: 'italic',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        backgroundColor: '#FFFFFF',
        paddingBottom: Platform.OS === 'ios' ? 40 : spacing.md,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        paddingHorizontal: spacing.lg,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 16,
        color: '#111827',
        marginRight: spacing.sm,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#E5E7EB',
    },
});
