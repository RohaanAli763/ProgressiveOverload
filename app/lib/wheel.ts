// Pure helpers for the NumberWheel (scroll picker) used to log weight and reps one-handed.

export const WEIGHT_MIN = 0;
export const WEIGHT_MAX = 300;
export const WEIGHT_STEP = 2.5; // kg; becomes a setting later (1 / 1.25 / 2.5 / 5)
export const WEIGHT_TYPED_MAX = 9999; // exercise_sets.weight is numeric(6,2)
export const REPS_MIN = 0;
export const REPS_MAX = 50;
export const REPS_TYPED_MAX = 999;

// Where the wheels start for a set that has no value yet (empty barbell, a common rep target).
export const DEFAULT_WEIGHT = 20;
export const DEFAULT_REPS = 8;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildValues(min: number, max: number, step: number): number[] {
  if (step <= 0 || max < min) return [min];
  const count = Math.floor(round2((max - min) / step)) + 1;
  return Array.from({ length: count }, (_, i) => round2(min + i * step));
}

// Adds a value that is off the step grid (e.g. an old 81 kg, or a typed 301) so it is kept, not rounded away.
export function withValue(values: number[], value: number): number[] {
  if (values.includes(value)) return values;
  return [...values, value].sort((a, b) => a - b);
}

export function nearestIndex(values: number[], value: number): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - value) < Math.abs(values[best] - value)) best = i;
  }
  return best;
}

export function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0));
}

// One notch up or down the wheel (what the +/- buttons and TalkBack swipes do).
export function stepValue(values: number[], value: number, dir: 1 | -1): number {
  const i = nearestIndex(values, value);
  return values[clampIndex(i + dir, values.length)];
}

export function formatValue(value: number): string {
  return String(round2(value));
}

// Parses a typed value ("82,5" works too). Returns null for junk; clamps to [min, max].
export function parseTyped(text: string, min: number, max: number, integer: boolean): number | null {
  const n = parseFloat(text.trim().replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  const v = integer ? Math.round(n) : round2(n);
  return Math.min(Math.max(v, min), max);
}
