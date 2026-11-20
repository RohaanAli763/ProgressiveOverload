import React from 'react';
import { View } from 'react-native';

// Redundant multimodal feedback: visual countdown + haptic + optional spoken cue when rest ends.
// TODO: implement
export default function RestTimer(_props: { seconds: number; onDone?: () => void }) {
  return <View />;
}
