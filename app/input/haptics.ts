// Multimodal output: tactile confirmation for set saved / timer done / error.
// TODO: implement with expo-haptics (not installed yet); respect prefs.haptics.
export type HapticEvent = 'setSaved' | 'restDone' | 'error';

export function triggerHaptic(_event: HapticEvent): void {}
