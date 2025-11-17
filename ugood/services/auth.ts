import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export const signInWithApple = async () => {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign In is only available on iOS');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple Sign In failed - no identity token');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return { data: null, error: { message: 'Sign in cancelled' } };
    }
    return { data: null, error };
  }
};

export const signInWithGoogle = async () => {
  try {
    const redirectTo = AuthSession.makeRedirectUri({ useProxy: true });
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) throw error;

    // For web, we need to handle the redirect
    if (Platform.OS === 'web' && data.url) {
      const result = await AuthSession.startAsync({
        authUrl: data.url,
        returnUrl: redirectTo,
      });

      if (result.type === 'success') {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        return { data: sessionData, error: sessionError };
      }
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
};

export const signUpWithEmail = async (email: string, password: string, name?: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || '',
          name: name || '',
        },
      },
    });
    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error: any) {
    return { error };
  }
};

export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  } catch (error: any) {
    return { session: null, error };
  }
};


