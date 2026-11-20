import React from 'react';
import { View } from 'react-native';

// +/- control for weight and reps so users avoid the keyboard (motor impairment, gloves, sweaty hands).
// Large targets (MIN_TOUCH_TARGET), accessibilityRole="adjustable" with increment/decrement actions.
// TODO: implement
export default function Stepper(_props: { value: number; step: number; label: string; onChange: (v: number) => void }) {
  return <View />;
}
