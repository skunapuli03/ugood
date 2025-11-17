import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signInWithApple, signInWithGoogle, signInWithEmail, signUpWithEmail } from '../services/auth';
import { useUserStore } from '../store/userStore';
import { colors, gradients, borderRadius, shadows } from '../utils/theme';

export default function SignInScreen() {
  const router = useRouter();
  const { setSession, setUser } = useUserStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'Apple Sign In is only available on iOS');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signInWithApple();
      if (error) {
        if (error.message !== 'Sign in cancelled') {
          Alert.alert('Error', error.message);
        }
      } else if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await signInWithGoogle();
      if (error) {
        Alert.alert('Error', error.message);
      } else if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isSignUp && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = isSignUp
        ? await signUpWithEmail(email, password, name.trim())
        : await signInWithEmail(email, password);

      if (error) {
        Alert.alert('Error', error.message);
      } else if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
        router.replace('/');
      } else if (isSignUp && data?.user) {
        Alert.alert('Success', 'Please check your email to verify your account');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>Welcome to UGood</Text>
        <Text style={styles.subtitle}>Your personal journaling companion</Text>
      </LinearGradient>

      <View style={styles.form}>
        {isSignUp && (
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={colors.light.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={colors.light.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.light.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.light.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.light.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleEmailAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setIsSignUp(!isSignUp);
            setName(''); // Clear name when switching modes
          }}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleText}>
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.button, styles.appleButton]}
            onPress={handleAppleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={20} color={colors.light.text} />
          <Text style={[styles.buttonText, styles.googleButtonText]}>Continue with Google</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 32,
    paddingTop: 80,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  form: {
    padding: 24,
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    height: 56,
    ...shadows.sm,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.light.text,
  },
  button: {
    height: 56,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.md,
  },
  primaryButton: {
    backgroundColor: colors.light.primary,
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  googleButton: {
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  googleButtonText: {
    color: colors.light.text,
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    color: colors.light.primary,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.light.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
});


