import {
  buildValues,
  clampIndex,
  formatValue,
  nearestIndex,
  parseTyped,
  stepValue,
  withValue,
} from './wheel';

describe('buildValues', () => {
  it('builds an inclusive range with float steps', () => {
    expect(buildValues(0, 10, 2.5)).toEqual([0, 2.5, 5, 7.5, 10]);
  });

  it('has no float drift on long ranges', () => {
    const values = buildValues(0, 300, 2.5);
    expect(values).toHaveLength(121);
    expect(values[120]).toBe(300);
    expect(values[33]).toBe(82.5);
    const small = buildValues(0, 5, 1.25);
    expect(small).toEqual([0, 1.25, 2.5, 3.75, 5]);
  });

  it('stops before max when the step does not divide the range', () => {
    expect(buildValues(0, 6, 2.5)).toEqual([0, 2.5, 5]);
  });

  it('falls back to [min] for a bad step or range', () => {
    expect(buildValues(0, 10, 0)).toEqual([0]);
    expect(buildValues(5, 1, 1)).toEqual([5]);
  });
});

describe('withValue', () => {
  it('returns the same array when the value is already there', () => {
    const values = [0, 2.5, 5];
    expect(withValue(values, 2.5)).toBe(values);
  });

  it('inserts off-grid values in order', () => {
    expect(withValue([0, 2.5, 5], 3)).toEqual([0, 2.5, 3, 5]);
    expect(withValue([0, 2.5, 5], 301)).toEqual([0, 2.5, 5, 301]);
  });
});

describe('nearestIndex', () => {
  it('finds the closest value, lower one on a tie', () => {
    const values = [0, 2.5, 5, 7.5];
    expect(nearestIndex(values, 5)).toBe(2);
    expect(nearestIndex(values, 6)).toBe(2);
    expect(nearestIndex(values, 6.25)).toBe(2);
    expect(nearestIndex(values, 100)).toBe(3);
    expect(nearestIndex(values, -3)).toBe(0);
  });
});

describe('clampIndex', () => {
  it('keeps the index inside the list', () => {
    expect(clampIndex(-1, 5)).toBe(0);
    expect(clampIndex(9, 5)).toBe(4);
    expect(clampIndex(2, 5)).toBe(2);
    expect(clampIndex(3, 0)).toBe(0);
  });
});

describe('stepValue', () => {
  const values = [0, 2.5, 5];
  it('moves one notch and stops at the ends', () => {
    expect(stepValue(values, 2.5, 1)).toBe(5);
    expect(stepValue(values, 2.5, -1)).toBe(0);
    expect(stepValue(values, 5, 1)).toBe(5);
    expect(stepValue(values, 0, -1)).toBe(0);
  });
});

describe('formatValue', () => {
  it('drops trailing zeros', () => {
    expect(formatValue(80)).toBe('80');
    expect(formatValue(82.5)).toBe('82.5');
    expect(formatValue(1.25)).toBe('1.25');
  });
});

describe('parseTyped', () => {
  it('parses decimals with dot or comma', () => {
    expect(parseTyped('82.5', 0, 9999, false)).toBe(82.5);
    expect(parseTyped(' 82,5 ', 0, 9999, false)).toBe(82.5);
  });

  it('rounds reps to whole numbers', () => {
    expect(parseTyped('8.6', 0, 999, true)).toBe(9);
  });

  it('clamps and rejects junk', () => {
    expect(parseTyped('-5', 0, 9999, false)).toBe(0);
    expect(parseTyped('12000', 0, 9999, false)).toBe(9999);
    expect(parseTyped('', 0, 9999, false)).toBeNull();
    expect(parseTyped('abc', 0, 9999, false)).toBeNull();
  });
});
