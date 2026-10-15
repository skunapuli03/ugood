import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmail, signUpWithEmail } from '../services/auth';
import { useUserStore } from '../store/userStore';
import { colors, borderRadius, shadows, spacing } from '../utils/theme';
import AppLogo from '../components/AppLogo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const FACTS = [
  "Finally, a journal that actually helps you. Most apps let you vent into the void. UGood spots your patterns and tells you the truth.",
  "A mirror with memory. It detects when you repeat old loops, giving you the exact reality check or grounded encouragement you need.",
  "Zero judgment. Total privacy. Your reflections are processed securely and never used to train AI models.",
];

const WHY_OPTIONS = [
  "Clarity in the chaos",
  "Breaking old habits",
  "Understanding my emotions",
  "Other"
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { session, setSession, setUser } = useUserStore();

  // ── Flow State ──
  const [phase, setPhase] = useState<'welcome' | 'slides' | 'auth-name' | 'auth-secure' | 'why' | 'kickoff'>('welcome');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auth Phase State
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Why Phase State
  const [selectedWhy, setSelectedWhy] = useState<string | null>(null);
  const [customWhy, setCustomWhy] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // ── Animations ──
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideContentAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const lockScaleAnim = useRef(new Animated.Value(1)).current;
  const [showLockIcon, setShowLockIcon] = useState(false);

  // Animate slide content entrance whenever slide changes
  useEffect(() => {
    if (phase === 'slides') {
      slideContentAnim.setValue(0);
      Animated.timing(slideContentAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [currentSlide, phase]);

  const bookRotate = spinAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '90deg'],
  });
  const bookOpacity = spinAnim.interpolate({
    inputRange: [0, 0.45, 0.5],
    outputRange: [1, 1, 0],
  });
  const lockRotate = spinAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-90deg', '-90deg', '0deg'],
  });
  const lockOpacity = spinAnim.interpolate({
    inputRange: [0.5, 0.55, 1],
    outputRange: [0, 1, 1],
  });

  // ── Handlers ──
  const handleGetStarted = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setPhase('slides');
      setCurrentSlide(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNextSlide = () => {
    if (currentSlide < FACTS.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      // Finished info slides -> move sequentially to name or why
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        if (session) {
          setPhase('why');
        } else {
          setPhase('auth-name');
        }
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    } else {
      setPhase('welcome');
    }
  };

  const handleNameContinue = () => {
    if (!name.trim()) {
      Alert.alert('Hey', 'We need a name to personalize your experience.');
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowLockIcon(true);
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setPhase('auth-secure');
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    });
  };

  const handleAuthSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please fill in all fields to secure your journal.');
      return;
    }

    setAuthLoading(true);
    try {
      const { data, error } = isSignUp
        ? await signUpWithEmail(email, password, name.trim())
        : await signInWithEmail(email, password);

      if (error) throw error;

      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);

        // Lock snap animation: dilate + lock shut
        setIsLocked(true);
        Animated.sequence([
          Animated.timing(lockScaleAnim, { toValue: 1.35, duration: 200, useNativeDriver: true }),
          Animated.spring(lockScaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
        ]).start();

        setTimeout(() => {
          setPhase('why');
        }, 900);
      } else if (isSignUp && data?.user) {
        Alert.alert('Verify Email', 'Please check your email to verify your account. Then sign in.');
        setIsSignUp(false);
      }
    } catch (err: any) {
      Alert.alert('Authentication Error', err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSelectWhy = (option: string) => {
    if (option === 'Other') {
      setShowCustomInput(true);
      setSelectedWhy('Other');
    } else {
      setSelectedWhy(option);
      setShowCustomInput(false);
      setPhase('kickoff');
    }
  };

  const handleCustomWhySubmit = () => {
    if (customWhy.trim()) {
      setPhase('kickoff');
    }
  };

  const finishOnboarding = async () => {
    const goal = customWhy.trim() || selectedWhy || 'Journaling';
    await AsyncStorage.setItem('ugood_user_goal', goal);
    await AsyncStorage.setItem('ai_onboarding_complete', 'true');
    router.replace('/journal/new');
  };

  // ── RENDER ──
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ════════════ PHASE 0: WELCOME ════════════ */}
          {phase === 'welcome' && (
            <Animated.View style={[styles.welcomeWrapper, { opacity: fadeAnim }]}>
              <View style={styles.welcomeHero}>
                <View style={styles.logoContainer}>
                  <AppLogo scale={0.85} animate={true} />
                </View>

                <Text style={styles.welcomeTitle}>UGood</Text>
                <Text style={styles.welcomeSubtitle}>A mirror with memory.</Text>
                <Text style={styles.welcomeDescription}>
                  A journal that spots your patterns, calls out your loops, and helps you actually grow.
                </Text>
              </View>

              <View style={styles.welcomeFooter}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleGetStarted}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.light.background} style={{ marginLeft: 8 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => router.push('/sign-in')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryButtonText}>I already have an account</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* ════════════ PHASE 1: SEQUENTIAL INFO SCREENS (FACTS) ════════════ */}
          {phase === 'slides' && (
            <Animated.View
              style={[
                styles.slidesWrapper,
                {
                  opacity: slideContentAnim,
                  transform: [
                    {
                      translateY: slideContentAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Top AppLogo */}
              <View style={styles.slideLogoArea}>
                <AppLogo scale={0.65} animate={true} />
              </View>

              {/* Exact Original Serif Fact Text */}
              <View style={styles.factTextWrapper}>
                <Text style={styles.factEditorialText}>
                  {FACTS[currentSlide]}
                </Text>
              </View>

              {/* Step Dots */}
              <View style={styles.progressDots}>
                {FACTS.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressDot,
                      index === currentSlide && styles.progressDotActive,
                    ]}
                  />
                ))}
              </View>

              {/* Sequential Actions: Next & Back */}
              <View style={styles.slideFooter}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleNextSlide}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>
                    {currentSlide === FACTS.length - 1 ? 'Continue' : 'Next'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.light.background} style={{ marginLeft: 8 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handlePrevSlide}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryButtonText}>
                    {currentSlide > 0 ? 'Previous' : 'Back'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* ════════════ PHASE 2: NAME ════════════ */}
          {phase === 'auth-name' && (
            <Animated.View style={[styles.formWrapper, { opacity: fadeAnim }]}>
              <View style={styles.formLogoArea}>
                <AppLogo scale={0.55} animate={false} />
              </View>

              <Text style={styles.formTitle}>What should we call you?</Text>

              <View style={styles.inputCard}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Your Name"
                  placeholderTextColor="rgba(61,61,61,0.35)"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, !name.trim() && styles.buttonDisabled]}
                onPress={handleNameContinue}
                disabled={!name.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.light.background} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ════════════ PHASE 3: AUTH SECURE (BOOK-TO-LOCK) ════════════ */}
          {phase === 'auth-secure' && (
            <Animated.View style={[styles.formWrapper, { opacity: fadeAnim }]}>
              {/* Book-to-Lock 3D Spin */}
              <View style={styles.spinContainer}>
                {!showLockIcon ? (
                  <AppLogo scale={0.55} animate={false} />
                ) : (
                  <View style={styles.spinWrapper}>
                    <Animated.View style={[styles.spinFace, {
                      opacity: bookOpacity,
                      transform: [{ perspective: 800 }, { rotateY: bookRotate }]
                    }]}>
                      <AppLogo scale={0.55} animate={false} />
                    </Animated.View>

                    <Animated.View style={[styles.spinFace, styles.spinFaceBack, {
                      opacity: lockOpacity,
                      transform: [{ perspective: 800 }, { rotateY: lockRotate }, { scale: lockScaleAnim }]
                    }]}>
                      <View style={styles.lockIconCircle}>
                        <Ionicons
                          name={isLocked ? "lock-closed" : "lock-open-outline"}
                          size={48}
                          color={colors.light.primary}
                        />
                      </View>
                    </Animated.View>
                  </View>
                )}
              </View>

              <Text style={styles.formTitle}>Let's keep your thoughts safe.</Text>

              <View style={styles.inputCard}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Email Address"
                  placeholderTextColor="rgba(61,61,61,0.35)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
                <View style={styles.inputDivider} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Password"
                  placeholderTextColor="rgba(61,61,61,0.35)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, authLoading && styles.buttonDisabled]}
                onPress={handleAuthSubmit}
                disabled={authLoading || isLocked}
                activeOpacity={0.85}
              >
                {authLoading ? (
                  <ActivityIndicator color={colors.light.background} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isSignUp ? "Secure Journals" : "Unlock Journals"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsSignUp(!isSignUp)}
                style={styles.toggleAuthBtn}
                disabled={authLoading || isLocked}
              >
                <Text style={styles.toggleAuthText}>
                  {isSignUp ? "Already have an account?" : "Need to create an account?"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ════════════ PHASE 4: WHY / GOALS ════════════ */}
          {phase === 'why' && (
            <Animated.View style={[styles.formWrapper, { opacity: fadeAnim }]}>
              <View style={styles.formLogoArea}>
                <AppLogo scale={0.55} animate={false} />
              </View>

              <Text style={styles.formTitle}>What are you looking for?</Text>

              <View style={styles.optionsList}>
                {WHY_OPTIONS.map((option, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.goalOption,
                      selectedWhy === option && styles.goalOptionActive,
                      option === "Other" && showCustomInput && { display: 'none' },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleSelectWhy(option)}
                  >
                    <Text
                      style={[
                        styles.goalOptionText,
                        selectedWhy === option && styles.goalOptionTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                    {selectedWhy === option && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.light.accent} />
                    )}
                  </TouchableOpacity>
                ))}

                {showCustomInput && (
                  <View style={styles.customGoalContainer}>
                    <TextInput
                      style={styles.customGoalInput}
                      placeholder="Type your reason..."
                      placeholderTextColor="rgba(61,61,61,0.4)"
                      value={customWhy}
                      onChangeText={setCustomWhy}
                      autoFocus
                      maxLength={100}
                      onSubmitEditing={handleCustomWhySubmit}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={[styles.primaryButton, !customWhy.trim() && styles.buttonDisabled, { marginTop: 16 }]}
                      onPress={handleCustomWhySubmit}
                      disabled={!customWhy.trim()}
                    >
                      <Text style={styles.primaryButtonText}>Begin</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* ════════════ PHASE 5: KICKOFF ════════════ */}
          {phase === 'kickoff' && (
            <Animated.View style={[styles.kickoffWrapper, { opacity: fadeAnim }]}>
              <View style={styles.formLogoArea}>
                <AppLogo scale={0.7} animate={true} />
              </View>

              <Text style={styles.kickoffTitle}>You're all set, {name || 'there'}.</Text>
              <Text style={styles.kickoffSubtitle}>
                Let’s capture your first thought to kick things off.
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, { width: '100%', marginTop: 32 }]}
                onPress={finishOnboarding}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Begin My First Entry</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.light.background} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  // ── Welcome Phase ──
  welcomeWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    minHeight: 560,
  },
  welcomeHero: {
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  logoContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginTop: 20,
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.primary,
    marginTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  welcomeDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(61,61,61,0.65)',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
    maxWidth: 320,
  },
  welcomeFooter: {
    width: '100%',
    gap: 12,
    marginTop: 36,
  },

  // ── Slides / Facts Phase ──
  slidesWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  slideLogoArea: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  factTextWrapper: {
    paddingHorizontal: 8,
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  factEditorialText: {
    fontSize: 24,
    lineHeight: 38,
    color: colors.light.text,
    textAlign: 'center',
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: 0.3,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(61,61,61,0.2)',
  },
  progressDotActive: {
    width: 20,
    backgroundColor: colors.light.accent,
  },
  slideFooter: {
    width: '100%',
    gap: 12,
  },

  // ── Forms (Name, Auth, Goals) ──
  formWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  formLogoArea: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.light.text,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 28,
  },
  inputCard: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: borderRadius.xl,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 24,
    ...shadows.sm,
  },
  textInput: {
    fontSize: 16,
    color: colors.light.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: 12,
  },
  toggleAuthBtn: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleAuthText: {
    fontSize: 14,
    color: colors.light.text,
    fontWeight: '500',
    opacity: 0.7,
  },

  // ── Book-to-Lock Spin ──
  spinContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  spinWrapper: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinFace: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinFaceBack: {
    position: 'absolute',
  },
  lockIconCircle: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 24,
    borderRadius: 60,
  },

  // ── Goals / Why ──
  optionsList: {
    gap: 12,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  goalOptionActive: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.light.accent,
    borderWidth: 2,
    ...shadows.sm,
  },
  goalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
  },
  goalOptionTextActive: {
    fontWeight: '700',
    color: colors.light.accent,
  },
  customGoalContainer: {
    marginTop: 12,
  },
  customGoalInput: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    fontSize: 16,
    color: colors.light.text,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },

  // ── Kickoff Phase ──
  kickoffWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  kickoffTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.light.text,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 10,
    marginTop: 10,
  },
  kickoffSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(61,61,61,0.65)',
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // ── Shared Buttons ──
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.text, // Charcoal primary action button
    borderRadius: borderRadius.xl,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
    ...shadows.md,
  },
  primaryButtonText: {
    color: colors.light.background, // Warm parchment text
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'rgba(61,61,61,0.7)',
    fontSize: 15,
    fontWeight: '500',
  },
});
