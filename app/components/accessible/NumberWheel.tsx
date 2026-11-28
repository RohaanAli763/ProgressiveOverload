import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Stepper from './Stepper';
import { clampIndex, formatValue, nearestIndex, parseTyped, stepValue, withValue } from '../../lib/wheel';
import { triggerHaptic } from '../../input/haptics';
import { useA11y } from '../../accessibility/A11yContext';

const ITEM_H = 48; // each row is a full touch target, so tapping a neighbour selects it
const VISIBLE = 5; // odd, so one row sits in the centre band
const PAD = ITEM_H * Math.floor(VISIBLE / 2);

// Vertical scroll picker for one-handed number entry (weight, reps).
// - Fling or drag with the thumb; it snaps to a value and ticks (haptic) on every change.
// - Tap a nearby row to jump to it. +/- buttons underneath move one notch.
// - Long-press to type an exact value (keyboard fallback).
// - TalkBack: one "adjustable" element; swipe up/down to change, actions for type-a-value.
export default function NumberWheel({
  base,
  value,
  onChange,
  label,
  unit,
  spokenUnit,
  integer = false,
  typedMax,
}: {
  base: number[]; // the step grid, e.g. 0..300 by 2.5
  value: number;
  onChange: (v: number) => void;
  label: string; // "Weight"
  unit: string; // "kg", shown
  spokenUnit: string; // "kilograms", read by TalkBack
  integer?: boolean;
  typedMax: number;
}) {
  // Off-grid values (an old 81 kg, a typed 301, a spoken 81) join the list instead of being rounded
  // away, and stay there so scrolling past them later doesn't shift the rows.
  const [extras, setExtras] = useState<number[]>(() => (base.includes(value) ? [] : [value]));
  if (!base.includes(value) && !extras.includes(value)) {
    setExtras([...extras, value]); // React's "adjust state while rendering" pattern
  }
  const values = useMemo(() => extras.reduce((list, v) => withValue(list, v), base), [base, extras]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const idxRef = useRef(-1); // index currently under the centre band
  const hc = useA11y().prefs.highContrast;

  // Keep the scroll position in sync when the value changes from outside the scroll
  // (+/- buttons, a tap, typing, TalkBack). Jumps without animation so no ticks fire on the way.
  useEffect(() => {
    const target = nearestIndex(values, value);
    if (target !== idxRef.current) {
      idxRef.current = target;
      scrollRef.current?.scrollTo({ y: target * ITEM_H, animated: false });
    }
  }, [value, values]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = clampIndex(Math.round(e.nativeEvent.contentOffset.y / ITEM_H), values.length);
    if (idx !== idxRef.current) {
      idxRef.current = idx;
      triggerHaptic('tick');
      onChange(values[idx]);
    }
  };

  const select = (v: number) => {
    if (v === value) return;
    triggerHaptic('tick');
    onChange(v);
  };

  const startTyping = () => {
    setDraft(formatValue(value));
    setTyping(true);
  };

  const commitTyping = () => {
    const parsed = parseTyped(draft, values[0], typedMax, integer);
    if (parsed !== null) select(parsed);
    setTyping(false);
  };

  const spoken = `${formatValue(value)} ${spokenUnit}`;

  return (
    <View style={styles.root}>
      <Text style={[styles.label, hc && hcStyles.muted]}>{`${label} (${unit})`.toUpperCase()}</Text>

      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: spoken }}
        accessibilityHint="Swipe up or down to change. Long press to type a value."
        accessibilityActions={[
          { name: 'increment' },
          { name: 'decrement' },
          { name: 'longpress', label: 'Type a value' },
        ]}
        onAccessibilityAction={(e) => {
          const name = e.nativeEvent.actionName;
          if (name === 'increment') select(stepValue(values, value, 1));
          else if (name === 'decrement') select(stepValue(values, value, -1));
          else if (name === 'longpress') startTyping();
        }}
        style={[styles.wheel, hc && hcStyles.wheel]}
      >
        <View pointerEvents="none" style={[styles.band, hc && hcStyles.band]} />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          snapToInterval={ITEM_H}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={onScroll}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => {
            // First layout: start on the current value.
            const target = nearestIndex(values, value);
            idxRef.current = target;
            scrollRef.current?.scrollTo({ y: target * ITEM_H, animated: false });
          }}
        >
          {values.map((v) => {
            const selected = v === value;
            return (
              <Pressable
                key={v}
                onPress={() => select(v)}
                onLongPress={startTyping}
                style={styles.item}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[
                    styles.itemText,
                    hc && hcStyles.muted,
                    selected && styles.itemTextSelected,
                    selected && hc && hcStyles.selected,
                  ]}
                >
                  {formatValue(v)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {typing && (
          <View style={styles.typeOverlay}>
            <TextInput
              style={styles.typeInput}
              value={draft}
              onChangeText={setDraft}
              keyboardType={integer ? 'number-pad' : 'decimal-pad'}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              // "Done" blurs the input, so committing on blur covers both Done and tapping away.
              onBlur={commitTyping}
              accessibilityLabel={`Type ${label.toLowerCase()} in ${spokenUnit}`}
            />
          </View>
        )}
      </View>

      <Stepper values={values} value={value} label={label.toLowerCase()} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 8 },
  label: {
    color: '#8b949e',
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  wheel: {
    height: ITEM_H * VISIBLE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#0d1117',
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PAD,
    height: ITEM_H,
    backgroundColor: 'rgba(88, 166, 255, 0.12)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#58a6ff',
  },
  content: { paddingVertical: PAD },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: { color: '#8b949e', fontSize: 18, fontFamily: 'Montserrat_700Bold' },
  itemTextSelected: { color: '#c9d1d9', fontSize: 26, fontFamily: 'Montserrat_800ExtraBold' },
  typeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PAD,
    height: ITEM_H,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  typeInput: {
    height: ITEM_H - 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#58a6ff',
    backgroundColor: '#161b22',
    color: '#c9d1d9',
    fontSize: 24,
    fontFamily: 'Montserrat_800ExtraBold',
    textAlign: 'center',
    padding: 0,
  },
});

// High contrast overrides (highContrastPalette in tokens.ts).
const hcStyles = StyleSheet.create({
  wheel: { backgroundColor: '#000000', borderColor: '#d0d7de' },
  band: { borderColor: '#79c0ff', backgroundColor: 'rgba(121, 192, 255, 0.18)' },
  muted: { color: '#d0d7de' },
  selected: { color: '#ffffff' },
});
