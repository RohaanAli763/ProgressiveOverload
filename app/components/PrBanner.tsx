import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatValue } from '../lib/wheel';
import type { PrKind } from '../lib/progress';

export type PrNotice = { key: number; exName: string; weight: number; reps: number; kind: PrKind };

const SHOW_MS = 4000;

// Gold banner under the header when a set beats the exercise's best. Hides by itself or on tap.
// The parent also announces it to TalkBack and fires a haptic (several channels).
export default function PrBanner({ pr, onHide }: { pr: PrNotice | null; onHide: () => void }) {
  useEffect(() => {
    if (!pr) return;
    const id = setTimeout(onHide, SHOW_MS);
    return () => clearTimeout(id);
    // Restart only for a new PR, not when the parent re-renders with a new onHide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pr?.key]);

  if (!pr) return null;

  return (
    <Pressable
      onPress={onHide}
      accessibilityRole="button"
      accessibilityLabel={`New personal record, ${pr.exName}, ${formatValue(pr.weight)} kilograms for ${pr.reps} reps. Tap to dismiss.`}
      style={styles.banner}
    >
      <MaterialIcons name="emoji-events" size={26} color="#d29922" />
      <View style={styles.textCol}>
        <Text style={styles.kicker}>{pr.kind === 'weight' ? 'NEW PR · HEAVIEST EVER' : 'NEW PR · BEST SET EVER'}</Text>
        <Text style={styles.body} numberOfLines={1}>
          {pr.exName} · {formatValue(pr.weight)} kg x {pr.reps}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 64,
    left: 14,
    right: 14,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1c1a0f',
    borderWidth: 1,
    borderColor: '#d29922',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  textCol: { flex: 1, gap: 2 },
  kicker: { color: '#d29922', fontSize: 10, fontFamily: 'Montserrat_800ExtraBold', letterSpacing: 1 },
  body: { color: '#c9d1d9', fontSize: 15, fontFamily: 'Montserrat_700Bold' },
});
