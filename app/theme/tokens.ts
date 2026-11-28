// Design tokens. Colors are still hardcoded per file; in high contrast mode the gym screens
// (workout, wheels, rest timer, Home, tab bar) layer `highContrastPalette` overrides on top.

export const MIN_TOUCH_TARGET = 48; // dp, Android guideline (Fitts's law: bigger + closer = faster)

// Contrast ratios against bg are noted for the report (WCAG AA text = 4.5:1, AAA = 7:1).
export const palette = {
  bg: '#0b141c',
  tabBar: '#0f1720',
  surface: '#161b22', // cards
  border: '#30363d',
  text: '#c9d1d9', // 12.0:1
  muted: '#8b949e', // 6.0:1
  placeholder: '#7d8590', // 5.0:1 (the old #3d444e was 1.9:1)
  accent: '#58a6ff', // 7.4:1
  action: '#238636', // white text on it: 4.6:1
} as const;

export type Palette = { [K in keyof typeof palette]: string };

// WCAG AAA (7:1) variant for low vision / glare in bright gyms.
export const highContrastPalette: Palette = {
  bg: '#000000',
  tabBar: '#000000',
  surface: '#0d1117',
  border: '#d0d7de',
  text: '#ffffff', // 21:1
  muted: '#d0d7de', // 14.5:1
  placeholder: '#d0d7de',
  accent: '#79c0ff', // 10.8:1
  action: '#116329', // white text on it: 7.4:1
};
