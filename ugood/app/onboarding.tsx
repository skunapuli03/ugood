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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { downloadModel, isModelDownloaded } from '../services/localLLM';
import { signInWithEmail, signUpWithEmail } from '../services/auth';
import { useUserStore } from '../store/userStore';
import { colors, borderRadius, shadows } from '../utils/theme';
import AppLogo from '../components/AppLogo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const FACTS = [
  "Naming an emotion reduces activity in your amygdala. You literally calm your brain just by finding the right word.",
  "We forget 90% of our daily experiences within a week. The moments shaping you are quietly slipping away.",
  "This is your space. No judgment, no audience. Just a quiet moment for you.",
];

// Hold times per fact (ms after fade-in completes)
const FACT_HOLD_TIMES = [8000, 7500, 7000];

const WHY_OPTIONS = [
  "Clarity in the chaos",
  "Breaking old habits",
  "Understanding my emotions",
  "Other"
];

// ── Pulsing Dots Component ──
const PulsingDots = () => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
    createPulse(dot1, 0).start();
    createPulse(dot2, 250).start();
    createPulse(dot3, 500).start();
  }, []);

  return (
    <View style={styles.dotsContainer}>
      {[dot1, dot2, dot3].map((anim, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
      ))}
    </View>
  );
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { session, setSession, setUser } = useUserStore();

  // ── State ──
  const [phase, setPhase] = useState<'facts' | 'auth-name' | 'auth-secure' | 'why'>('facts');
  const [factIndex, setFactIndex] = useState(0);
  const [downloadReady, setDownloadReady] = useState(false);

  // Auth Phase
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Why Phase
  const [selectedWhy, setSelectedWhy] = useState<string | null>(null);
  const [customWhy, setCustomWhy] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // ── Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const authNameFadeAnim = useRef(new Animated.Value(0)).current;
  const authSecureFadeAnim = useRef(new Animated.Value(0)).current;
  const lockScaleAnim = useRef(new Animated.Value(1)).current;
  const whyFadeAnim = useRef(new Animated.Value(0)).current;

  // Book-to-Lock spin animation
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [showLockIcon, setShowLockIcon] = useState(false);

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

  // ── Start download immediately on mount ──
  useEffect(() => {
    startDownload();
  }, []);

  const startDownload = async () => {
    const downloaded = await isModelDownloaded();
    if (downloaded) {
      setDownloadReady(true);
      return;
    }
    try {
      await downloadModel((prog) => {
        if (prog >= 1) {
          setDownloadReady(true);
        }
      });
      // Bug fix: download resolved means it's done, even if progress didn't hit exactly 1.0
      setDownloadReady(true);
    } catch (e: any) {
      console.error('Download failed:', e);
      setDownloadReady(true); // Proceed anyway on fail
    }
  };

  // ── Fact Transitions ──
  useEffect(() => {
    if (phase !== 'facts') return;

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const isLastFact = factIndex === FACTS.length - 1;
    let timer: any;

    const transitionOut = () => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }).start(() => {
        if (isLastFact) {
          if (session) {
            setPhase('why');
          } else {
            setPhase('auth-name');
          }
        } else {
          setFactIndex(prev => prev + 1);
        }
      });
    };

    if (!isLastFact) {
      timer = setTimeout(transitionOut, FACT_HOLD_TIMES[factIndex]);
    } else {
      // Last fact: Wait for download to finish + minimum reading time
      const startTime = Date.now();
      const checkReady = setInterval(() => {
        if (downloadReady && (Date.now() - startTime > FACT_HOLD_TIMES[factIndex])) {
          clearInterval(checkReady);
          transitionOut();
        }
      }, 500);
      return () => clearInterval(checkReady);
    }

    return () => clearTimeout(timer);
  }, [factIndex, phase, downloadReady, session]);

  // ── Auth Name Phase Entrance ──
  useEffect(() => {
    if (phase === 'auth-name') {
      Animated.timing(authNameFadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [phase]);

  // ── Book-to-Lock Spin + Auth Secure Phase ──
  const handleNameContinue = () => {
    if (!name.trim()) {
      Alert.alert('Hey', 'We need a name to personalize your experience.');
      return;
    }

    // Fade out the name form
    Animated.timing(authNameFadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      // Now spin the book into a lock
      setShowLockIcon(true);
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        // After spin completes, show the secure form
        setPhase('auth-secure');
      });
    });
  };

  // ── Auth Secure Phase Entrance ──
  useEffect(() => {
    if (phase === 'auth-secure') {
      Animated.timing(authSecureFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [phase]);

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
          Animated.timing(lockScaleAnim, { toValue: 1.4, duration: 200, useNativeDriver: true }),
          Animated.spring(lockScaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true })
        ]).start();

        // Hold on locked state, then transition to "Why"
        setTimeout(() => {
          Animated.timing(authSecureFadeAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }).start(() => {
            setPhase('why');
          });
        }, 1200);

      } else if (isSignUp && data?.user) {
        Alert.alert('Verify Email', 'Please check your email to verify your account. Then sign in.');
        setIsSignUp(false);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Why Phase Entrance ──
  useEffect(() => {
    if (phase === 'why') {
      Animated.timing(whyFadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [phase]);

  const handleSelectWhy = (option: string) => {
    if (option === "Other") {
      setShowCustomInput(true);
      setSelectedWhy("Other");
    } else {
      setSelectedWhy(option);
      setShowCustomInput(false);
      finishOnboarding(option);
    }
  };

  const handleCustomSubmit = () => {
    if (customWhy.trim()) {
      finishOnboarding(customWhy.trim());
    }
  };

  const finishOnboarding = async (goal: string) => {
    await AsyncStorage.setItem('ugood_user_goal', goal);
    await AsyncStorage.setItem('ai_onboarding_complete', 'true');
    router.replace('/journal/new');
  };

  // ── RENDER ──
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Icon Area — Book or Lock */}
      <View style={styles.iconArea}>
        {/* Book (AppLogo) — visible until spin completes */}
        {!showLockIcon && (
          <AppLogo scale={0.6} animate={true} />
        )}
        {showLockIcon && (
          <View style={styles.spinContainer}>
            {/* Book side (spinning away) */}
            <Animated.View style={[styles.spinFace, {
              opacity: bookOpacity,
              transform: [{ perspective: 800 }, { rotateY: bookRotate }]
            }]}>
              <AppLogo scale={0.6} animate={false} />
            </Animated.View>

            {/* Lock side (spinning in) */}
            <Animated.View style={[styles.spinFace, styles.spinFaceBack, {
              opacity: lockOpacity,
              transform: [{ perspective: 800 }, { rotateY: lockRotate }, { scale: lockScaleAnim }]
            }]}>
              <View style={styles.lockIconCircle}>
                <Ionicons
                  name={isLocked ? "lock-closed" : "lock-open-outline"}
                  size={52}
                  color={colors.light.primary}
                />
              </View>
            </Animated.View>
          </View>
        )}
      </View>

      {/* Content Area */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Facts Phase ── */}
        {phase === 'facts' && (
          <View style={styles.factsWrapper}>
            <Animated.Text style={[styles.factText, { opacity: fadeAnim }]}>
              {FACTS[factIndex]}
            </Animated.Text>
            <PulsingDots />
          </View>
        )}

        {/* ── Auth Name Phase ── */}
        {phase === 'auth-name' && (
          <Animated.View style={[styles.authContainer, { opacity: authNameFadeAnim }]}>
            <Text style={styles.authTitle}>What should we call you?</Text>

            <View style={styles.formContainer}>
              <TextInput
                style={styles.authInput}
                placeholder="Your Name"
                placeholderTextColor="rgba(61,61,61,0.35)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.authButton, !name.trim() && styles.authButtonDisabled]}
                onPress={handleNameContinue}
                disabled={!name.trim()}
                activeOpacity={0.8}
              >
                <Text style={styles.authButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ── Auth Secure Phase ── */}
        {phase === 'auth-secure' && (
          <Animated.View style={[styles.authContainer, styles.authContainerSecure, { opacity: authSecureFadeAnim }]}>
            <Text style={[styles.authTitle, styles.authTitleSecure]}>Let's keep your thoughts safe.</Text>

            <View style={styles.formContainer}>
              <TextInput
                style={styles.authInput}
                placeholder="Email Address"
                placeholderTextColor="rgba(61,61,61,0.35)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
              <TextInput
                style={styles.authInput}
                placeholder="Password"
                placeholderTextColor="rgba(61,61,61,0.35)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.authButton, authLoading && styles.authButtonDisabled]}
                onPress={handleAuthSubmit}
                disabled={authLoading || isLocked}
                activeOpacity={0.8}
              >
                {authLoading ? (
                  <ActivityIndicator color={colors.light.background} />
                ) : (
                  <Text style={styles.authButtonText}>
                    {isSignUp ? "Secure Journals" : "Unlock Journals"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsSignUp(!isSignUp)}
                style={styles.toggleButton}
                disabled={authLoading || isLocked}
              >
                <Text style={styles.toggleText}>
                  {isSignUp ? "Already have an account?" : "Need to create an account?"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ── Why Phase ── */}
        {phase === 'why' && (
          <Animated.View style={[styles.whyContainer, { opacity: whyFadeAnim }]}>
            <Text style={styles.whyTitle}>What are you looking for?</Text>

            <View style={styles.optionsContainer}>
              {WHY_OPTIONS.map((option, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.optionButton,
                    selectedWhy === option && styles.optionButtonActive,
                    option === "Other" && showCustomInput && { display: 'none' }
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleSelectWhy(option)}
                >
                  <Text style={[
                    styles.optionText,
                    selectedWhy === option && styles.optionTextActive
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}

              {showCustomInput && (
                <View style={styles.customInputContainer}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="Type your reason..."
                    placeholderTextColor="rgba(61,61,61,0.4)"
                    value={customWhy}
                    onChangeText={setCustomWhy}
                    autoFocus
                    maxLength={100}
                    onSubmitEditing={handleCustomSubmit}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[styles.submitButton, !customWhy.trim() && styles.submitButtonDisabled]}
                    onPress={handleCustomSubmit}
                    disabled={!customWhy.trim()}
                  >
                    <Text style={styles.submitButtonText}>Begin</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },

  // ── Top Icon Area ──
  iconArea: {
    flex: 0.4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 5,
    paddingTop: 70,
  },
  spinContainer: {
    width: 200,
    height: 200,
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

  // ── Content Area ──
  contentScroll: {
    flex: 0.6,
  },
  contentContainer: {
    paddingHorizontal: 32,
    alignItems: 'center',
    paddingBottom: 40,
  },

  // ── Facts ──
  factsWrapper: {
    alignItems: 'center',
    paddingTop: 80,
  },
  factText: {
    fontSize: 26,
    lineHeight: 40,
    color: colors.light.text,
    textAlign: 'center',
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: 0.3,
    marginTop: 10,
  },

  // ── Pulsing Dots ──
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 40,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(61,61,61,0.4)',
  },

  // ── Auth Shared ──
  authContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
  },
  authContainerSecure: {
    paddingTop: 0,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.light.text,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 24,
  },
  authTitleSecure: {
    marginBottom: 8,
  },
  formContainer: {
    width: '100%',
    gap: 10,
  },
  authInput: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.light.text,
  },
  authButton: {
    backgroundColor: colors.light.text,
    borderRadius: borderRadius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    ...shadows.md,
  },
  authButtonDisabled: {
    backgroundColor: 'rgba(61,61,61,0.15)',
    shadowOpacity: 0,
    elevation: 0,
  },
  authButtonText: {
    color: colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: colors.light.accent,
    fontWeight: '500',
  },

  // ── Why Phase ──
  whyContainer: {
    width: '100%',
    alignItems: 'center',
  },
  whyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 32,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
  },
  optionButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: colors.light.primary,
    borderColor: 'rgba(37,99,235,0.1)',
  },
  optionText: {
    fontSize: 16,
    color: 'rgba(61,61,61,0.8)',
    fontWeight: '500',
  },
  optionTextActive: {
    color: colors.light.background,
    fontWeight: '600',
  },

  // ── Custom Input ──
  customInputContainer: {
    width: '100%',
    marginTop: 4,
  },
  customInput: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: colors.light.text,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: colors.light.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    ...shadows.md,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(61,61,61,0.1)',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
