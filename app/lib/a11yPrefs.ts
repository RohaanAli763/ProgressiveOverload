// Central accessibility preferences. Covers permanent, temporary and situational impairments.
// Text size is not here on purpose: the app follows the phone's own font size setting.
export type WeightStep = 1 | 1.25 | 2.5 | 5;

export type A11yPrefs = {
  highContrast: boolean; // low vision, bright gym lighting
  reduceMotion: boolean; // vestibular disorders
  leftHanded: boolean; // main buttons (Save, Skip) move to the left thumb
  haptics: boolean; // feedback without looking at the screen
  voiceInput: boolean; // log sets hands-free (sweaty/chalky hands, motor impairment)
  audioCues: boolean; // spoken rest timer alerts
  weightStep: WeightStep; // kg per notch on the weight wheel
};

export const defaultPrefs: A11yPrefs = {
  highContrast: false,
  reduceMotion: false,
  leftHanded: false,
  haptics: true,
  voiceInput: false,
  audioCues: false,
  weightStep: 2.5,
};

export const PREFS_STORAGE_KEY = 'gymyaki.a11yPrefs';

export const WEIGHT_STEPS: WeightStep[] = [1, 1.25, 2.5, 5];
const BOOL_KEYS = ['highContrast', 'reduceMotion', 'leftHanded', 'haptics', 'voiceInput', 'audioCues'] as const;

// Turns whatever was stored (possibly old, partial or corrupt JSON) into valid prefs.
// Unknown or wrongly typed fields fall back to `base`.
export function parsePrefs(raw: string | null, base: A11yPrefs = defaultPrefs): A11yPrefs {
  if (!raw) return base;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return base;
  }
  if (typeof data !== 'object' || data === null) return base;
  const obj = data as Record<string, unknown>;
  const prefs: A11yPrefs = { ...base };
  for (const key of BOOL_KEYS) {
    if (typeof obj[key] === 'boolean') prefs[key] = obj[key];
  }
  if (WEIGHT_STEPS.includes(obj.weightStep as WeightStep)) prefs.weightStep = obj.weightStep as WeightStep;
  return prefs;
}
