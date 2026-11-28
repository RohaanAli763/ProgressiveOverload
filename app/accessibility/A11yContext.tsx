import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultPrefs, parsePrefs, PREFS_STORAGE_KEY, type A11yPrefs } from '../lib/a11yPrefs';
import { highContrastPalette, palette, type Palette } from '../theme/tokens';
import { setHapticsEnabled } from '../input/haptics';

export type { A11yPrefs } from '../lib/a11yPrefs';
export { defaultPrefs } from '../lib/a11yPrefs';

type Ctx = {
  prefs: A11yPrefs;
  colors: Palette;
  screenReaderOn: boolean;
  setPref: <K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => void;
};

const A11yContext = createContext<Ctx>({
  prefs: defaultPrefs,
  colors: palette,
  screenReaderOn: false,
  setPref: () => {},
});

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPrefs>(defaultPrefs);
  const [screenReaderOn, setScreenReaderOn] = useState(false);

  // Load stored prefs. On first launch (nothing stored) seed reduceMotion from the OS setting.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [raw, osReduceMotion, osScreenReader] = await Promise.all([
          AsyncStorage.getItem(PREFS_STORAGE_KEY),
          AccessibilityInfo.isReduceMotionEnabled(),
          AccessibilityInfo.isScreenReaderEnabled(),
        ]);
        if (!alive) return;
        setPrefs(parsePrefs(raw, { ...defaultPrefs, reduceMotion: osReduceMotion }));
        setScreenReaderOn(osScreenReader);
      } catch (err) {
        console.error('[A11y] Failed to load prefs:', err);
      }
    })();
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReaderOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    setHapticsEnabled(prefs.haptics);
  }, [prefs.haptics]);

  const setPref = useCallback(<K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next)).catch((err) =>
        console.error('[A11y] Failed to save prefs:', err)
      );
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      prefs,
      colors: prefs.highContrast ? highContrastPalette : palette,
      screenReaderOn,
      setPref,
    }),
    [prefs, screenReaderOn, setPref]
  );

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y() {
  return useContext(A11yContext);
}
