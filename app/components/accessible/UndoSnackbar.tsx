import React, { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';

export type UndoNotice = { key: number; message: string };

const SHOW_MS = 5000;

// Error tolerance: deletes happen right away in the UI and can be undone for a few seconds,
// instead of an "Are you sure?" dialog on every delete (one tap fewer, and mistakes are recoverable).
// The parent only commits the delete in `onExpire`.
export default function UndoSnackbar({
  undo,
  onUndo,
  onExpire,
  bottom = 16,
}: {
  undo: UndoNotice | null;
  onUndo: () => void;
  onExpire: () => void;
  bottom?: number;
}) {
  useEffect(() => {
    if (!undo) return;
    AccessibilityInfo.announceForAccessibility(`${undo.message}. Undo available.`);
    const id = setTimeout(onExpire, SHOW_MS);
    return () => clearTimeout(id);
    // Restart only for a new notice, not when the parent re-renders with new callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo?.key]);

  if (!undo) return null;

  return (
    <View style={[styles.bar, { bottom }]}>
      <MaterialIcons name="delete-outline" size={20} color="#c9d1d9" />
      <Text style={styles.text} numberOfLines={2}>
        {undo.message}
      </Text>
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel={`Undo. ${undo.message}`}
        style={({ pressed }) => [styles.undoBtn, pressed && styles.pressed]}
      >
        <Text style={styles.undoText}>UNDO</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: { flex: 1, color: '#c9d1d9', fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  undoBtn: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET + 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  undoText: { color: '#58a6ff', fontSize: 14, fontFamily: 'Montserrat_800ExtraBold', letterSpacing: 1 },
  pressed: { opacity: 0.75 },
});
