import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import Main from './app/Main';
import Auth from './app/screens/Auth';
import { A11yProvider } from './app/accessibility/A11yContext';
import { supabase } from './app/lib/supabase';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <A11yProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0b141c" translucent={false} />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#58a6ff" />
            </View>
          ) : session ? (
            <Main session={session} />
          ) : (
            <Auth />
          )}
        </SafeAreaView>
      </A11yProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b141c',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b141c',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
