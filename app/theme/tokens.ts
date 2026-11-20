// Design tokens. Today colors are hardcoded per file; screens migrate here gradually.
// TODO: add a high-contrast palette and font scaling driven by A11yContext.

export const MIN_TOUCH_TARGET = 48; // dp, Android guideline (Fitts's law: bigger + closer = faster)

export const palette = {
  bg: '#0b141c',
  tabBar: '#0f1720',
  border: '#30363d',
  text: '#c9d1d9',
  muted: '#8b949e',
  accent: '#58a6ff',
  action: '#238636',
} as const;

export type Palette = { [K in keyof typeof palette]: string };

// TODO: WCAG AAA (7:1) variant for low vision / glare in bright gyms
export const highContrastPalette: Palette = { ...palette };
