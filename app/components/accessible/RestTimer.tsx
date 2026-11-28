import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { formatClock, remainingSec, REST_ADJUST_SEC, spokenDuration } from '../../lib/session';
import { useA11y } from '../../accessibility/A11yContext';

// Rest countdown pinned to the bottom of the screen (thumb zone).
// Time is computed from a timestamp, so it stays right if the app was in the background.
// When rest ends the bar turns green and `onFinished` fires once; the parent adds the
// haptic and optional spoken cue (redundant channels: never audio alone).
export default function RestTimer({
  endAt,
  total,
  onAdjust,
  onSkip,
  onFinished,
}: {
  endAt: number; // ms timestamp
  total: number; // seconds, for the progress bar
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
  onFinished: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);
  const { prefs } = useA11y();
  const hc = prefs.highContrast;

  useEffect(() => {
    firedRef.current = false;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt) {
        clearInterval(id);
        if (!firedRef.current) {
          firedRef.current = true;
          onFinished();
        }
      }
    }, 250);
    return () => clearInterval(id);
    // onFinished is intentionally left out: a new function each parent render must not restart the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endAt]);

  const left = remainingSec(endAt, now);

  if (left === 0) {
    return (
      <View style={[styles.bar, styles.barDone]}>
        <MaterialIcons name="notifications-active" size={22} color="#fff" />
        <Text style={styles.doneText}>REST OVER · NEXT SET</Text>
        <Pressable
          onPress={onSkip}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss rest timer"
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <MaterialIcons name="close" size={22} color="#fff" />
        </Pressable>
      </View>
    );
  }

  const progress = Math.min(1, left / Math.max(total, 1));

  const skip = (
    <Pressable
      key="skip"
      onPress={onSkip}
      accessibilityRole="button"
      accessibilityLabel="Skip rest"
      style={({ pressed }) => [styles.skipBtn, hc && hcStyles.skipBtn, pressed && styles.pressed]}
    >
      <Text style={[styles.skipText, hc && hcStyles.accent]}>SKIP</Text>
    </Pressable>
  );

  return (
    // Left-handed layout puts Skip (the most used button) first, under the left thumb.
    <View style={[styles.bar, hc && hcStyles.bar, prefs.leftHanded && styles.barReversed]}>
      <View style={[styles.progress, hc && hcStyles.progress, { width: `${progress * 100}%` }]} />

      <Pressable
        onPress={() => onAdjust(-REST_ADJUST_SEC)}
        accessibilityRole="button"
        accessibilityLabel={`Rest ${REST_ADJUST_SEC} seconds less`}
        style={({ pressed }) => [styles.adjustBtn, hc && hcStyles.adjustBtn, pressed && styles.pressed]}
      >
        <Text style={[styles.adjustText, hc && hcStyles.text]}>−{REST_ADJUST_SEC}</Text>
      </Pressable>

      <View
        style={styles.center}
        accessible
        accessibilityLabel={`Rest timer, ${spokenDuration(left)} left`}
      >
        <Text style={[styles.label, hc && hcStyles.muted]}>REST</Text>
        <Text style={[styles.time, hc && hcStyles.text]} maxFontSizeMultiplier={1.4}>
          {formatClock(left)}
        </Text>
      </View>

      <Pressable
        onPress={() => onAdjust(REST_ADJUST_SEC)}
        accessibilityRole="button"
        accessibilityLabel={`Rest ${REST_ADJUST_SEC} seconds more`}
        style={({ pressed }) => [styles.adjustBtn, hc && hcStyles.adjustBtn, pressed && styles.pressed]}
      >
        <Text style={[styles.adjustText, hc && hcStyles.text]}>+{REST_ADJUST_SEC}</Text>
      </Pressable>

      {skip}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: MIN_TOUCH_TARGET + 16,
    backgroundColor: '#161b22',
    borderTopWidth: 1,
    borderTopColor: '#30363d',
    overflow: 'hidden',
  },
  barReversed: { flexDirection: 'row-reverse' },
  barDone: { backgroundColor: '#238636', borderTopColor: '#2ea043', justifyContent: 'center' },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 3,
    backgroundColor: '#58a6ff',
  },
  adjustBtn: {
    width: MIN_TOUCH_TARGET + 8,
    height: MIN_TOUCH_TARGET,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#21262d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustText: { color: '#c9d1d9', fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  center: { flex: 1, alignItems: 'center' },
  label: { color: '#8b949e', fontSize: 10, fontFamily: 'Montserrat_700Bold', letterSpacing: 1 },
  time: { color: '#c9d1d9', fontSize: 26, fontFamily: 'Montserrat_800ExtraBold' },
  skipBtn: {
    height: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(88, 166, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(88, 166, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { color: '#58a6ff', fontSize: 12, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.8 },
  doneText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: 0.8,
  },
  iconBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
});

// High contrast overrides (highContrastPalette in tokens.ts).
const hcStyles = StyleSheet.create({
  bar: { backgroundColor: '#000000', borderTopColor: '#d0d7de' },
  progress: { backgroundColor: '#79c0ff', height: 4 },
  adjustBtn: { backgroundColor: '#000000', borderColor: '#d0d7de' },
  skipBtn: { backgroundColor: '#000000', borderColor: '#79c0ff' },
  text: { color: '#ffffff' },
  muted: { color: '#d0d7de' },
  accent: { color: '#79c0ff' },
});
