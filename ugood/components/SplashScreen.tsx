import React, { useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Easing,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/theme';

const { width, height } = Dimensions.get('window');

// Floating Particle — lavender-tinted
const Particle = ({ delay, size, startX, startY }: {
    delay: number; size: number; startX: number; startY: number;
}) => {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(opacity, {
                    toValue: 0.4,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={{
                position: 'absolute',
                left: startX,
                top: startY,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: colors.light.pastelMint, // Mint particle
                opacity,
            }}
        />
    );
};

interface SplashScreenProps {
    onAnimationComplete: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
    // Animation values
    const bloomOpacity = useRef(new Animated.Value(0)).current;
    const bloomScale = useRef(new Animated.Value(0.5)).current;
    const iconOpacity = useRef(new Animated.Value(0)).current;
    const iconScale = useRef(new Animated.Value(0.8)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(20)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const footerOpacity = useRef(new Animated.Value(0)).current;
    const fadeOut = useRef(new Animated.Value(1)).current;

    // Breathing pulse for the bloom
    const bloomPulse = useRef(new Animated.Value(0)).current;

    // Generate random particles
    const particles = useMemo(() => {
        return [...Array(6)].map((_, i) => ({
            id: i,
            delay: Math.random() * 3000,
            size: 3 + Math.random() * 5,
            startX: Math.random() * width,
            startY: Math.random() * height,
        }));
    }, []);

    useEffect(() => {
        const runSequence = () => {
            // Phase 1: Bloom glow appears (0-800ms)
            Animated.parallel([
                Animated.timing(bloomOpacity, {
                    toValue: 0.6,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.spring(bloomScale, {
                    toValue: 1,
                    friction: 10,
                    tension: 20,
                    useNativeDriver: true,
                }),
            ]).start();

            // Phase 2: Book icon materializes (200ms)
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(iconOpacity, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.spring(iconScale, {
                        toValue: 1,
                        friction: 8,
                        tension: 30,
                        useNativeDriver: true,
                    }),
                ]).start();
            }, 200);

            // Phase 3: Title "UGood" fades in (500ms)
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(titleOpacity, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(titleTranslateY, {
                        toValue: 0,
                        duration: 600,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ]).start();
            }, 500);

            // Phase 4: Tagline + footer (800ms)
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(taglineOpacity, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(footerOpacity, {
                        toValue: 0.4,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ]).start();
            }, 800);

            // Start breathing pulse
            setTimeout(() => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(bloomPulse, {
                            toValue: 1,
                            duration: 2000,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                        Animated.timing(bloomPulse, {
                            toValue: 0,
                            duration: 2000,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            }, 1500);

            // Phase 5: Fade out + transition (3500ms)
            setTimeout(() => {
                Animated.timing(fadeOut, {
                    toValue: 0,
                    duration: 600,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }).start(() => onAnimationComplete());
            }, 3500);
        };

        setTimeout(runSequence, 200);
    }, []);

    const bloomPulseScale = bloomPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.08],
    });

    return (
        <Animated.View style={[styles.container, { opacity: fadeOut }]}>
            {/* Warm Parchment Background */}
            <View style={StyleSheet.absoluteFill} />

            {/* Ambient Radial Glow — lavender bloom */}
            <Animated.View
                style={[
                    styles.bloomOuter,
                    {
                        opacity: bloomOpacity,
                        transform: [{ scale: Animated.multiply(bloomScale, bloomPulseScale) }],
                    },
                ]}
            />

            {/* Floating Particles */}
            {particles.map((p) => (
                <Particle key={p.id} {...p} />
            ))}

            {/* Central Composition */}
            <View style={styles.centerComposition}>
                {/* Book Icon Frame */}
                <Animated.View
                    style={[
                        styles.iconFrame,
                        {
                            opacity: iconOpacity,
                            transform: [{ scale: iconScale }],
                        },
                    ]}
                >
                    {/* Soft bloom behind icon */}
                    <View style={styles.iconBloom} />
                    {/* Tilted paper frame */}
                    <View style={styles.iconPaperFrame} />
                    {/* Book icon */}
                    <Ionicons
                        name="book-outline"
                        size={120}
                        color={colors.light.primary} // Replaced lavender with primary pastel blue
                        style={styles.bookIcon}
                    />
                    {/* Inner light source */}
                    <View style={styles.innerLight} />
                </Animated.View>

                {/* Brand Identity */}
                <View style={styles.brandContainer}>
                    {/* Glowing "UGood" Title */}
                    <Animated.Text
                        style={[
                            styles.title,
                            {
                                opacity: titleOpacity,
                                transform: [{ translateY: titleTranslateY }],
                            },
                        ]}
                    >
                        UGood
                    </Animated.Text>

                    {/* Tagline */}
                    <Animated.Text
                        style={[styles.tagline, { opacity: taglineOpacity }]}
                    >
                        A JOURNAL THAT CARES.
                    </Animated.Text>
                </View>
            </View>

            {/* Footer Decorative Elements */}
            <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
                <View style={styles.footerLine} />
                <Ionicons
                    name="sparkles-outline"
                    size={14}
                    color="rgba(37,99,235,0.4)" // Soft blue
                />
                <View style={styles.footerLine} />
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.light.background, // #F5F2EA warm parchment
        zIndex: 9999,
        overflow: 'hidden',
    },
    bloomOuter: {
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: 250,
        backgroundColor: 'rgba(197, 235, 252, 0.15)', // Light blue bloom
    },
    centerComposition: {
        alignItems: 'center',
        gap: 48,
    },
    iconFrame: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBloom: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: 'rgba(226, 247, 225, 0.4)', // Pastel Mint bloom
    },
    iconPaperFrame: {
        position: 'absolute',
        width: 180,
        height: 180,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 16,
        transform: [{ rotate: '3deg' }],
    },
    bookIcon: {
        zIndex: 2,
    },
    innerLight: {
        position: 'absolute',
        bottom: 40,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.light.pastelYellow, // Cozy yellow light source
    },
    brandContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 72,
        fontWeight: '500',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        color: colors.light.text, // Wellness Charcoal
        letterSpacing: -2,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    tagline: {
        marginTop: 16,
        fontSize: 12,
        fontWeight: '300',
        color: 'rgba(61,61,61,0.5)', // charcoal 50%
        letterSpacing: 3,
    },
    footer: {
        position: 'absolute',
        bottom: 60,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    footerLine: {
        width: 32,
        height: 1,
        backgroundColor: 'rgba(184,161,209,0.2)',
    },
});
