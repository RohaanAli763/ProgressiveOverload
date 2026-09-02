import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onSuccess?: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to extract session tokens from deep link URL
  const handleDeepLinkUrl = async (url: string) => {
    if (!url) return;

    try {
      let accessToken = '';
      let refreshToken = '';
      let code = '';

      if (url.includes('#')) {
        const hashString = url.split('#')[1];
        const params = new URLSearchParams(hashString);
        accessToken = params.get('access_token') || '';
        refreshToken = params.get('refresh_token') || '';
      } else if (url.includes('?')) {
        const queryString = url.split('?')[1];
        const params = new URLSearchParams(queryString);
        accessToken = params.get('access_token') || '';
        refreshToken = params.get('refresh_token') || '';
        code = params.get('code') || '';
      }

      if (accessToken && refreshToken) {
        setLoading(true);
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setErrorMessage(error.message);
        } else if (onSuccess) {
          onSuccess();
        }
      } else if (code) {
        setLoading(true);
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setErrorMessage(error.message);
        } else if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process authentication redirect.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLinkUrl(url);
    });

    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url) handleDeepLinkUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setLoading(true);

    try {
      // Primary scheme matching the configured Supabase Redirect URL
      const redirectUrl = 'gymyaki://';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'An error occurred launching the Google sign-in page.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <MaterialIcons name="fitness-center" size={36} color="#58a6ff" />
          </View>
          <Text style={styles.appName}>GymYaki</Text>
          <Text style={styles.tagline}>Track sets. Overload lifts. Progress daily.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.welcomeTitle}>Welcome to GymYaki</Text>
          <Text style={styles.welcomeSubtitle}>
            Sign in with your Google account to access your workouts and history.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={18} color="#f85149" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              loading && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0d1117" size="small" />
            ) : (
              <View style={styles.googleBtnContent}>
                <View style={styles.googleIconCircle}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.footerInfo}>
          <MaterialIcons name="lock-outline" size={14} color="#6e7681" />
          <Text style={styles.footerNote}>
            Secured by Supabase Google OAuth Authentication
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b141c',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(88, 166, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(88, 166, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    color: '#58a6ff',
    fontSize: 32,
    fontFamily: 'Montserrat_900Black',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    color: '#8b949e',
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#161b22',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    gap: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  welcomeTitle: {
    color: '#f0f6fc',
    fontSize: 20,
    fontFamily: 'Montserrat_800ExtraBold',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 81, 73, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  errorText: {
    color: '#f85149',
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    flex: 1,
  },
  googleButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#ffffff',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Montserrat_900Black',
  },
  googleButtonText: {
    color: '#1f2328',
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 28,
  },
  footerNote: {
    color: '#6e7681',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
});
