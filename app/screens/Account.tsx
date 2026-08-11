import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AccountProps {
  session?: Session | null;
}

export default function Account({ session }: AccountProps) {
  const [signingOut, setSigningOut] = useState(false);
  const email = session?.user?.email || 'Logged in user';
  const initial = email.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.emailText} numberOfLines={1}>
              {email}
            </Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Authenticated</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <MaterialIcons name="fingerprint" size={20} color="#8b949e" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {session?.user?.id || '—'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="cloud-done" size={20} color="#8b949e" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Database Sync</Text>
            <Text style={styles.infoValue}>Supabase Connected</Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.signOutButton,
          signingOut && styles.signOutButtonDisabled,
          pressed && styles.pressed,
        ]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color="#f85149" size="small" />
        ) : (
          <>
            <MaterialIcons name="logout" size={18} color="#f85149" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  card: {
    backgroundColor: '#161b22',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(88, 166, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#58a6ff',
    fontSize: 22,
    fontFamily: 'Montserrat_900Black',
  },
  profileDetails: {
    flex: 1,
    gap: 4,
  },
  emailText: {
    color: '#f0f6fc',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#3fb950',
  },
  statusText: {
    color: '#3fb950',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  divider: {
    height: 1,
    backgroundColor: '#30363d',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: '#8b949e',
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: '#c9d1d9',
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.3)',
    borderRadius: 14,
    height: 48,
    gap: 8,
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutText: {
    color: '#f85149',
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
  },
  pressed: {
    opacity: 0.8,
  },
});
