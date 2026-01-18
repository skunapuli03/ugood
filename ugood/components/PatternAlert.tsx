import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../utils/theme';

interface PatternAlertProps {
    onPress: () => void;
    recentEntryId: string;
}

export default function PatternAlert({ onPress, recentEntryId }: PatternAlertProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                delay: 300,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
                <LinearGradient
                    colors={['#FFFBEB', '#FEF3C7']} // Amber-50 to Amber-100 (Warm paper feel)
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.content}
                >
                    <View style={styles.iconContainer}>
                        <Ionicons name="sparkles" size={20} color="#D97706" />
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.label}>NEW INSIGHT</Text>
                        <Text style={styles.message}>
                            Your connected self noticed a pattern in your recent entries...
                        </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color="#92400E" />
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
        marginHorizontal: 4,
        borderRadius: 12,
        ...shadows.md,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FDE68A', // Amber-200
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        gap: 2,
    },
    label: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#D97706', // Amber-600
        letterSpacing: 1,
    },
    message: {
        fontSize: 14,
        color: '#78350F', // Amber-900
        fontWeight: '500',
        lineHeight: 20,
    },
});
