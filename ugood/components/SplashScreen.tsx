import React, { useEffect, useRef, useMemo } from 'react';
import {
    View,
    StyleSheet,
    Animated,
    Dimensions,
    Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, colors } from '../utils/theme';

const { width, height } = Dimensions.get('window');

// Particle Component
const Particle = ({ delay, duration, startX, startY }: any) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, {
                    toValue: 1,
                    duration: duration,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const translateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -100], // Float up
    });

    const opacity = anim.interpolate({
        inputRange: [0, 0.2, 0.8, 1],
        outputRange: [0, 0.8, 0.8, 0],
    });

    return (
        <Animated.View
            style={[
                styles.particle,
                {
                    left: startX,
                    top: startY,
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
        />
    );
};

// Warp Line Component for transition
const WarpLine = ({ delay, duration, angle }: any) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(anim, {
                toValue: 1,
                duration: duration,
                easing: Easing.in(Easing.exp),
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const scaleY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.1, 4],
    });

    const opacity = anim.interpolate({
        inputRange: [0, 0.8, 1],
        outputRange: [0, 1, 0],
    });

    const translateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [height, -height],
    });

    return (
        <Animated.View
            style={[
                styles.warpLine,
                {
                    transform: [
                        { rotate: `${angle}deg` },
                        { translateY },
                        { scaleY }
                    ],
                    opacity,
                },
            ]}
        />
    );
};

interface SplashScreenProps {
    onAnimationComplete: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
    // Main Animation Values
    const lightBeamOpacity = useRef(new Animated.Value(0)).current;
    const lightBeamRotate = useRef(new Animated.Value(0)).current;
    const journalScale = useRef(new Animated.Value(0.8)).current;
    const journalOpacity = useRef(new Animated.Value(0)).current;
    const journalBreathing = useRef(new Animated.Value(0)).current;
    const coverRotation = useRef(new Animated.Value(0)).current;
    const zoomScale = useRef(new Animated.Value(1)).current;
    const fadeOut = useRef(new Animated.Value(1)).current;
    const warpOpacity = useRef(new Animated.Value(0)).current;

    // Pages
    const page1 = useRef(new Animated.Value(0)).current;
    const page2 = useRef(new Animated.Value(0)).current;
    const page3 = useRef(new Animated.Value(0)).current;
    const page4 = useRef(new Animated.Value(0)).current;
    const page5 = useRef(new Animated.Value(0)).current;
    const page6 = useRef(new Animated.Value(0)).current;

    // Generate random particles
    const particles = useMemo(() => {
        return [...Array(20)].map((_, i) => ({
            id: i,
            delay: Math.random() * 2000,
            duration: 2000 + Math.random() * 2000,
            startX: Math.random() * width,
            startY: Math.random() * height,
        }));
    }, []);

    // Generate warp lines
    const warpLines = useMemo(() => {
        return [...Array(10)].map((_, i) => ({
            id: i,
            delay: Math.random() * 500,
            duration: 800 + Math.random() * 500,
            angle: (Math.random() - 0.5) * 40, // Slight fan effect
        }));
    }, []);


    useEffect(() => {
        const runSequence = () => {
            // Phase 1: The Awakening (0-1000ms)
            // Light beam sweeps in, Journal emerges from darkness
            Animated.parallel([
                Animated.timing(lightBeamOpacity, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
                Animated.timing(lightBeamRotate, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(journalOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
                Animated.spring(journalScale, { toValue: 1, friction: 8, tension: 10, useNativeDriver: true }),
            ]).start(() => {
                // Breathing effect while waiting
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(journalBreathing, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                        Animated.timing(journalBreathing, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
                    ])
                ).start();

                // Phase 2: The Open (1000-1800ms)
                setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(coverRotation, {
                            toValue: 1,
                            duration: 800,
                            easing: Easing.out(Easing.cubic),
                            useNativeDriver: true,
                        }),
                        // Pages flutter out organic wave
                        Animated.stagger(50, [
                            Animated.timing(page1, { toValue: 1, duration: 600, useNativeDriver: true }),
                            Animated.timing(page2, { toValue: 1, duration: 600, useNativeDriver: true }),
                            Animated.timing(page3, { toValue: 1, duration: 600, useNativeDriver: true }),
                            Animated.timing(page4, { toValue: 1, duration: 600, useNativeDriver: true }),
                            Animated.timing(page5, { toValue: 1, duration: 600, useNativeDriver: true }),
                            Animated.timing(page6, { toValue: 1, duration: 600, useNativeDriver: true }),
                        ])
                    ]).start(() => {
                        // Phase 3: Warp Speed Zoom (1800ms+)
                        Animated.parallel([
                            Animated.timing(warpOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                            Animated.timing(zoomScale, {
                                toValue: 50, // Massive zoom past the book
                                duration: 1200,
                                easing: Easing.in(Easing.exp), // Exponential acceleration
                                useNativeDriver: true
                            }),
                            Animated.timing(fadeOut, {
                                toValue: 0,
                                duration: 400,
                                delay: 600,
                                useNativeDriver: true
                            })
                        ]).start(() => onAnimationComplete());
                    });
                }, 300);
            });
        };

        setTimeout(runSequence, 100);
    }, []);

    const rotateZ = lightBeamRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['-15deg', '0deg']
    });

    const breathingScale = journalBreathing.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.03]
    });

    const coverRotateY = coverRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-150deg']
    });

    const createPageRotation = (anim: Animated.Value) =>
        anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-145deg'] });

    return (
        <Animated.View style={[styles.container, { opacity: fadeOut }]}>
            {/* Deep Space Background */}
            <LinearGradient
                colors={['#0F172A', '#1E1B4B', '#312E81']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            {/* Volumetric Light Beam */}
            <Animated.View style={[
                styles.lightBeamContainer,
                { opacity: lightBeamOpacity, transform: [{ rotateZ: rotateZ }, { scale: 1.5 }] }
            ]}>
                <LinearGradient
                    colors={['rgba(255,255,255,0.0)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.0)'] as any}
                    style={styles.lightBeam}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                />
            </Animated.View>

            {/* Floating Particles */}
            {particles.map((p) => (
                <Particle key={p.id} {...p} />
            ))}

            {/* Warp Lines (Hidden until zoom) */}
            <Animated.View style={{ ...StyleSheet.absoluteFillObject, opacity: warpOpacity }}>
                {warpLines.map((w) => (
                    <WarpLine key={w.id} {...w} />
                ))}
            </Animated.View>

            {/* The Journal */}
            <Animated.View style={[
                styles.journalWrapper,
                {
                    opacity: journalOpacity,
                    transform: [
                        { scale: Animated.multiply(journalScale, breathingScale) },
                        { scale: zoomScale }, // The Warp Zoom
                    ]
                }
            ]}>
                {/* Back Cover */}
                <View style={styles.backCover}>
                    <LinearGradient colors={['#312E81', '#4338CA']} style={{ flex: 1 }} />
                </View>

                {/* Pages Stack */}
                <View style={styles.pagesStack}>
                    {[...Array(8)].map((_, i) => (
                        <View key={i} style={[styles.pageEdge, { top: 4 + i * 2 }]} />
                    ))}

                    {/* Content Page (Target of Zoom) */}
                    <View style={styles.pageContent}>
                        <View style={styles.textLine} />
                        <View style={[styles.textLine, { width: '80%' }]} />
                        <View style={[styles.textLine, { width: '90%' }]} />
                        <View style={[styles.textLine, { width: '60%' }]} />
                    </View>
                </View>

                {/* Flipping Pages */}
                {[page6, page5, page4, page3, page2, page1].map((anim, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.flippingPage,
                            {
                                transform: [{ perspective: 1000 }, { rotateY: createPageRotation(anim) }],
                                zIndex: 100 + i // Ensure correct rendering order
                            }
                        ]}
                    >
                        <View style={styles.pageInner}>
                            <View style={styles.textLineLight} />
                            <View style={[styles.textLineLight, { width: '70%' }]} />
                        </View>
                    </Animated.View>
                ))}

                {/* Front Cover */}
                <Animated.View style={[
                    styles.frontCover,
                    { transform: [{ perspective: 1000 }, { rotateY: coverRotateY }] }
                ]}>
                    <LinearGradient
                        colors={gradients.primary as any}
                        style={styles.coverGradient}
                    >
                        {/* Glow effect on cover */}
                        <LinearGradient
                            colors={['rgba(255,255,255,0.4)', 'transparent'] as any}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100 }}
                        />

                        <View style={styles.embossedCircle}>
                            <View style={styles.goldAccent} />
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Spine */}
                <View style={styles.spine}>
                    <LinearGradient colors={['#4338CA', '#3730A3']} style={{ flex: 1 }} />
                </View>

            </Animated.View>

        </Animated.View>
    );
}

const JOURNAL_WIDTH = 200;
const JOURNAL_HEIGHT = 260;

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        zIndex: 9999,
        overflow: 'hidden', // Contain warp lines
    },
    lightBeamContainer: {
        position: 'absolute',
        width: width * 2,
        height: height,
        top: 0,
        left: -width / 2,
    },
    lightBeam: {
        flex: 1,
    },
    particle: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 215, 0, 0.6)', // Golden specs
    },
    warpLine: {
        position: 'absolute',
        width: 2,
        height: 100,
        backgroundColor: 'rgba(255,255,255,0.5)',
        top: '50%',
        left: '50%',
    },
    journalWrapper: {
        width: JOURNAL_WIDTH,
        height: JOURNAL_HEIGHT,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 20,
    },
    backCover: {
        position: 'absolute',
        right: 0,
        width: JOURNAL_WIDTH - 15,
        height: JOURNAL_HEIGHT,
        borderRadius: 4,
        overflow: 'hidden',
    },
    pagesStack: {
        position: 'absolute',
        right: 2,
        top: 4,
        width: JOURNAL_WIDTH - 18,
        height: JOURNAL_HEIGHT - 8,
        borderRadius: 2,
        backgroundColor: '#FFF9F0',
    },
    pageEdge: {
        position: 'absolute',
        left: 0,
        width: '100%',
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    pageContent: {
        padding: 20,
        paddingTop: 40,
        gap: 10,
    },
    textLine: {
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2,
        width: '100%'
    },
    flippingPage: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: JOURNAL_WIDTH - 20,
        height: JOURNAL_HEIGHT - 8,
        backgroundColor: '#FFFDF5',
        borderRadius: 2,
        transformOrigin: 'left', // Pivot on the left edge for book fold
        backfaceVisibility: 'hidden',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(0,0,0,0.05)',
    },
    pageInner: {
        flex: 1,
        padding: 20,
        paddingTop: 30,
        gap: 8,
    },
    textLineLight: {
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 2,
        width: '100%'
    },
    frontCover: {
        position: 'absolute',
        right: 0,
        width: JOURNAL_WIDTH - 15,
        height: JOURNAL_HEIGHT,
        borderRadius: 4,
        transformOrigin: 'left',
        backfaceVisibility: 'hidden',
        overflow: 'hidden',
    },
    coverGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    embossedCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    goldAccent: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,215,0,0.1)',
    },
    spine: {
        position: 'absolute',
        left: 0,
        width: 18,
        height: JOURNAL_HEIGHT,
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 4,
        overflow: 'hidden',
    }

});
