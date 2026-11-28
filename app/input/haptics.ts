import * as Haptics from 'expo-haptics';

// Multimodal output: tactile confirmation for set saved / timer done / error, and a light
// tick per value on the number wheel. Lets the user confirm an action without looking.
export type HapticEvent = 'tick' | 'setSaved' | 'restDone' | 'error';

// Mirrors prefs.haptics; set by A11yProvider so callers don't need the context.
let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function triggerHaptic(event: HapticEvent): void {
  if (!enabled) return;
  const run = (): Promise<void> => {
    switch (event) {
      case 'tick':
        return Haptics.selectionAsync();
      case 'setSaved':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'restDone': {
        // Three heavy pulses: one buzz is easy to miss mid-conversation or with the phone in a pocket.
        const pulse = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        setTimeout(pulse, 350);
        setTimeout(pulse, 700);
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      case 'error':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  // Haptics are a nice-to-have: never let a device without a vibrator break a save.
  run().catch(() => {});
}
