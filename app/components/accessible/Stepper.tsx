import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { stepValue } from '../../lib/wheel';
import { triggerHaptic } from '../../input/haptics';
import { useA11y } from '../../accessibility/A11yContext';

// +/- buttons that move one notch along a value list. A second way to adjust a NumberWheel
// for users who can't fling accurately (tremor, gloves, sweaty hands). Large targets (Fitts's law).
export default function Stepper({
  values,
  value,
  label,
  onChange,
}: {
  values: number[];
  value: number;
  label: string;
  onChange: (v: number) => void;
}) {
  const hc = useA11y().prefs.highContrast;
  const atMin = value <= values[0];
  const atMax = value >= values[values.length - 1];

  const press = (dir: 1 | -1) => {
    triggerHaptic('tick');
    onChange(stepValue(values, value, dir));
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => press(-1)}
        disabled={atMin}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        accessibilityState={{ disabled: atMin }}
        style={({ pressed }) => [styles.btn, hc && hcStyles.btn, atMin && styles.disabled, pressed && styles.pressed]}
      >
        <MaterialIcons name="remove" size={24} color={hc ? '#ffffff' : '#c9d1d9'} />
      </Pressable>
      <Pressable
        onPress={() => press(1)}
        disabled={atMax}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        accessibilityState={{ disabled: atMax }}
        style={({ pressed }) => [styles.btn, hc && hcStyles.btn, atMax && styles.disabled, pressed && styles.pressed]}
      >
        <MaterialIcons name="add" size={24} color={hc ? '#ffffff' : '#c9d1d9'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    height: MIN_TOUCH_TARGET + 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#21262d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.75 },
});

// High contrast overrides (highContrastPalette in tokens.ts).
const hcStyles = StyleSheet.create({
  btn: { backgroundColor: '#000000', borderColor: '#d0d7de' },
});
