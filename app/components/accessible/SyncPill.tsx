import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSyncStatus } from '../../services/offlineSync';

// Visibility of system status (Norman): shows when the phone is offline or sets are still
// waiting to sync, so the user trusts that nothing was lost. Hidden when all is synced.
export default function SyncPill() {
  const { online, pending } = useSyncStatus();
  if (online && pending === 0) return null;

  const waiting = `${pending} ${pending === 1 ? 'change' : 'changes'} waiting`;
  const text = online ? `Syncing · ${waiting}` : pending > 0 ? `Offline · ${waiting}` : 'Offline · sets will save on this phone';

  return (
    <View
      style={[styles.pill, online ? styles.syncing : styles.offline]}
      accessible
      accessibilityLabel={text}
      accessibilityLiveRegion="polite"
    >
      <MaterialIcons name={online ? 'cloud-upload' : 'cloud-off'} size={16} color={online ? '#58a6ff' : '#d29922'} />
      <Text style={[styles.text, online ? styles.textSyncing : styles.textOffline]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
  },
  offline: { backgroundColor: '#1c1a0f', borderColor: '#d29922' },
  syncing: { backgroundColor: 'rgba(88, 166, 255, 0.1)', borderColor: 'rgba(88, 166, 255, 0.45)' },
  text: { fontSize: 12, fontFamily: 'Montserrat_700Bold' },
  textOffline: { color: '#d29922' },
  textSyncing: { color: '#58a6ff' },
});
