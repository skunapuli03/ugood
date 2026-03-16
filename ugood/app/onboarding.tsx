import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { downloadModel, isModelDownloaded } from '../services/localLLM';
import { colors, spacing, borderRadius } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OnboardingScreen() {
    const router = useRouter();
    const [progress, setProgress] = useState(0);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        // Fade in text on mount
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();

        checkAndDownloadModel();
    }, []);

    const checkAndDownloadModel = async () => {
        const downloaded = await isModelDownloaded();
        if (downloaded) {
            setProgress(1);
            setIsReady(true);
            await AsyncStorage.setItem('ai_onboarding_complete', 'true');
            return;
        }

        setDownloading(true);
        setError(null);

        try {
            await downloadModel((prog) => {
                setProgress(prog);
                if (prog >= 1) {
                    setIsReady(true);
                    setDownloading(false);
                    AsyncStorage.setItem('ai_onboarding_complete', 'true');
                }
            });
        } catch (e: any) {
            console.error('Download failed:', e);
            setError('Connection lost. Please restart the app to try again.');
            setDownloading(false);
        }
    };

    const handleEnterJournal = () => {
        if (isReady) {
            router.replace('/(tabs)');
        }
    };

    return (
        <View style={styles.container}>
            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
            >
                <View style={styles.iconContainer}>
                    <Ionicons name="leaf-outline" size={40} color={colors.light.primary} />
                </View>

                <Text style={styles.title}>Your Private Space</Text>

                <View style={styles.textBlock}>
                    <Text style={styles.paragraph}>
                        [Placeholder: Welcome back to yourself. UGood is designed to help you reflect on your days and track your feelings.]
                    </Text>
                    <Text style={styles.paragraph}>
                        [Placeholder: To uncover patterns, UGood uses an AI that runs entirely on your phone. Your journal entries never leave your device.]
                    </Text>
                    <Text style={styles.paragraph}>
                        [Placeholder: Right now, we are setting up this intelligence securely. Take a deep breath. Your safe space is almost ready.]
                    </Text>
                </View>

            </Animated.ScrollView>

            {/* Fixed Bottom Section for Progress and Action */}
            <View style={styles.bottomSection}>
                {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                            <Animated.View
                                style={[
                                    styles.progressFill,
                                    { width: `${Math.min(100, progress * 100)}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressLabel}>
                            {isReady ? 'Setup Complete' : `Setting up your private AI... ${Math.round(progress * 100)}%`}
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.button, isReady ? styles.buttonReady : styles.buttonDisabled]}
                    activeOpacity={0.8}
                    disabled={!isReady}
                    onPress={handleEnterJournal}
                >
                    <Text style={[styles.buttonText, isReady ? styles.buttonTextReady : styles.buttonTextDisabled]}>
                        Enter My Journal
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        padding: spacing.xl,
        paddingTop: 80,
        paddingBottom: 40,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#111827',
        marginBottom: spacing.xl,
        letterSpacing: -0.5,
    },
    textBlock: {
        gap: spacing.lg,
    },
    paragraph: {
        fontSize: 18,
        lineHeight: 28,
        color: '#4B5563',
        fontWeight: '400',
    },
    bottomSection: {
        padding: spacing.xl,
        paddingBottom: 40,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    progressContainer: {
        marginBottom: spacing.xl,
    },
    progressTrack: {
        height: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: spacing.sm,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.light.primary,
        borderRadius: 2,
    },
    progressLabel: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '500',
    },
    errorText: {
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: spacing.xl,
        fontSize: 14,
    },
    button: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonReady: {
        backgroundColor: '#111827',
    },
    buttonDisabled: {
        backgroundColor: '#F3F4F6',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    buttonTextReady: {
        color: '#FFFFFF',
    },
    buttonTextDisabled: {
        color: '#9CA3AF',
    },
});
