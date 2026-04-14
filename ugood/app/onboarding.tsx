import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { downloadModel, isModelDownloaded } from '../services/localLLM';
import { colors, spacing, borderRadius } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// ── Phase 1: Cinematic lines ──
const STORY_LINES = [
  'Every day, you feel things.',
  'Some you notice. Some you don\'t.',
  'What if you could look back\nand actually understand yourself?',
  'UGood.\nA journal that cares.',
];

// ── Phase 2: Quiz questions ──
const QUIZ = [
  {
    question: 'What brought you here?',
    options: ['Self reflection', 'Track my moods', 'Build a habit', 'Just curious'],
  },
  {
    question: 'How often do you reflect on your day?',
    options: ['Daily', 'Sometimes', 'Rarely', 'Never tried'],
  },
  {
    question: 'One thing you value most?',
    options: ['Honesty', 'Growth', 'Peace', 'Connection'],
  },
];

type Phase = 'story' | 'quiz' | 'trust';

export default function OnboardingScreen() {
  const router = useRouter();

  // ── State ──
  const [phase, setPhase] = useState<Phase>('story');
  const [storyIndex, setStoryIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [downloadReady, setDownloadReady] = useState(false);

  // ── Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const quizFade = useRef(new Animated.Value(0)).current;
  const trustFade = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;

  // ── Start download immediately on mount ──
  useEffect(() => {
    startDownload();
  }, []);

  const startDownload = async () => {
    const downloaded = await isModelDownloaded();
    if (downloaded) {
      setProgress(1);
      setDownloadReady(true);
      await AsyncStorage.setItem('ai_onboarding_complete', 'true');
      return;
    }

    try {
      await downloadModel((prog) => {
        setProgress(prog);
        if (prog >= 1) {
          setDownloadReady(true);
          AsyncStorage.setItem('ai_onboarding_complete', 'true');
        }
      });
    } catch (e: any) {
      console.error('Download failed:', e);
    }
  };

  // ── Phase 1: Cinematic text reveals ──
  useEffect(() => {
    if (phase !== 'story') return;
    animateIn();
  }, [storyIndex, phase]);

  useEffect(() => {
    if (phase !== 'story') return;

    const timer = setTimeout(() => {
      if (storyIndex < STORY_LINES.length - 1) {
        animateOut(() => setStoryIndex(prev => prev + 1));
      } else {
        // Last line shown, transition to quiz after pause
        setTimeout(() => {
          animateOut(() => setPhase('quiz'));
        }, 2000);
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [storyIndex, phase]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = (callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => callback());
  };

  // ── Phase 2: Quiz entrance ──
  useEffect(() => {
    if (phase !== 'quiz') return;
    quizFade.setValue(0);
    Animated.timing(quizFade, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [phase, quizIndex]);

  const handleQuizAnswer = useCallback((answer: string) => {
    const newAnswers = [...quizAnswers, answer];
    setQuizAnswers(newAnswers);

    // Save for future personalization
    AsyncStorage.setItem('ugood_quiz_answers', JSON.stringify(newAnswers));

    if (quizIndex < QUIZ.length - 1) {
      // Fade out, then next question
      Animated.timing(quizFade, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setQuizIndex(prev => prev + 1));
    } else {
      // All answered, proceed to trust phase
      Animated.timing(quizFade, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setPhase('trust'));
    }
  }, [quizAnswers, quizIndex]);

  // ── Phase 3: Trust entrance ──
  useEffect(() => {
    if (phase !== 'trust') return;
    trustFade.setValue(0);
    buttonScale.setValue(0.9);
    Animated.timing(trustFade, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [phase]);

  // Button bounce when download completes
  useEffect(() => {
    if (downloadReady && phase === 'trust') {
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [downloadReady, phase]);

  const handleEnter = () => {
    if (downloadReady) {
      router.replace('/(tabs)');
    }
  };

  // ── RENDER ──

  // Phase 1: Cinematic Story
  if (phase === 'story') {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Animated.Text
            style={[
              styles.storyText,
              storyIndex === STORY_LINES.length - 1 && styles.storyTextBrand,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {STORY_LINES[storyIndex]}
          </Animated.Text>
        </View>

        {/* Subtle dot indicators */}
        <View style={styles.dotsContainer}>
          {STORY_LINES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === storyIndex && styles.dotActive]}
            />
          ))}
        </View>
      </View>
    );
  }

  // Phase 2: Interactive Quiz
  if (phase === 'quiz') {
    const currentQ = QUIZ[quizIndex];
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.quizContainer, { opacity: quizFade }]}>
          {/* Quiz progress */}
          <Text style={styles.quizStep}>
            {quizIndex + 1} of {QUIZ.length}
          </Text>

          <Text style={styles.quizQuestion}>{currentQ.question}</Text>

          <View style={styles.optionsGrid}>
            {currentQ.options.map((option, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.optionCard, { backgroundColor: getOptionColor(i) }]}
                activeOpacity={0.7}
                onPress={() => handleQuizAnswer(option)}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    );
  }

  // Phase 3: Trust + Progress
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.trustContainer, { opacity: trustFade }]}>
        {/* Shield icon */}
        <View style={styles.shieldIcon}>
          <Ionicons name="shield-checkmark-outline" size={36} color={colors.light.accent} />
        </View>

        <Text style={styles.trustTitle}>Your space. Only yours.</Text>

        <Text style={styles.trustBody}>
          UGood runs a private AI entirely on your phone. Your entries never leave your device. Not to train models, not to improve algorithms. Everything stays between you and your journal.
        </Text>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {downloadReady ? 'Your private AI is ready.' : `Setting up your private AI... ${Math.round(progress * 100)}%`}
          </Text>
        </View>

        {/* CTA Button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
          <TouchableOpacity
            style={[styles.ctaButton, downloadReady ? styles.ctaReady : styles.ctaDisabled]}
            activeOpacity={0.8}
            disabled={!downloadReady}
            onPress={handleEnter}
          >
            <Text style={[styles.ctaText, downloadReady ? styles.ctaTextReady : styles.ctaTextDisabled]}>
              Write Your First Entry
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// Pastel option colors cycling through palette
function getOptionColor(index: number): string {
  const palette = [
    colors.light.pastelMint,
    colors.light.pastelBlue,
    colors.light.pastelYellow,
    colors.light.pastelPurple,
  ];
  return palette[index % palette.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Phase 1: Story ──
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  storyText: {
    fontSize: 28,
    fontWeight: '400',
    color: colors.light.text,
    textAlign: 'center',
    lineHeight: 40,
  },
  storyTextBrand: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 44,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 60,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(61,61,61,0.15)',
  },
  dotActive: {
    backgroundColor: colors.light.accent,
    width: 20,
    borderRadius: 3,
  },

  // ── Phase 2: Quiz ──
  quizContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    width: '100%',
  },
  quizStep: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.4)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 16,
  },
  quizQuestion: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.light.text,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 38,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  optionCard: {
    width: (width - 76) / 2,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: borderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.text,
    textAlign: 'center',
  },

  // ── Phase 3: Trust ──
  trustContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  shieldIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(184,161,209,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  trustTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.light.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 36,
  },
  trustBody: {
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(61,61,61,0.65)',
    textAlign: 'center',
    marginBottom: 48,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 32,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.light.accent,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 13,
    color: 'rgba(61,61,61,0.5)',
    textAlign: 'center',
    fontWeight: '500',
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaReady: {
    backgroundColor: colors.light.text,
    shadowColor: '#3D3D3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaDisabled: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  ctaTextReady: {
    color: colors.light.background,
  },
  ctaTextDisabled: {
    color: 'rgba(61,61,61,0.3)',
  },
});
