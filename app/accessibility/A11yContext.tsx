import React, { createContext, useContext } from 'react';

// Central accessibility preferences. Covers permanent, temporary and situational impairments.
export type A11yPrefs = {
  highContrast: boolean; // low vision, bright gym lighting
  textScale: 1 | 1.25 | 1.5; // low vision, phone on the floor
  reduceMotion: boolean; // vestibular disorders
  oneHanded: boolean; // injured arm, holding a dumbbell: actions move to the bottom thumb zone
  haptics: boolean; // feedback without looking at the screen
  voiceInput: boolean; // log sets hands-free (sweaty/chalky hands, motor impairment)
  audioCues: boolean; // rest timer announcements
};

export const defaultPrefs: A11yPrefs = {
  highContrast: false,
  textScale: 1,
  reduceMotion: false,
  oneHanded: false,
  haptics: true,
  voiceInput: false,
  audioCues: false,
};

type Ctx = { prefs: A11yPrefs; setPref: <K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => void };

const A11yContext = createContext<Ctx>({ prefs: defaultPrefs, setPref: () => {} });

// TODO: persist prefs in AsyncStorage; seed from OS settings (AccessibilityInfo.isReduceMotionEnabled, screen reader)
export function A11yProvider({ children }: { children: React.ReactNode }) {
  return <A11yContext.Provider value={{ prefs: defaultPrefs, setPref: () => {} }}>{children}</A11yContext.Provider>;
}

export function useA11y() {
  return useContext(A11yContext);
}
