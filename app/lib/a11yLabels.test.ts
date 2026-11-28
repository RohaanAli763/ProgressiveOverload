import { setLabel } from './a11yLabels';

describe('setLabel', () => {
  it('reads a full set with previous', () => {
    expect(setLabel(2, { weight: 80, reps: 8, previous: '75 x 8' })).toBe(
      'Set 2, 80 kilograms, 8 reps, previous 75 by 8'
    );
  });

  it('handles singulars and decimals', () => {
    expect(setLabel(1, { weight: 1, reps: 1, previous: null })).toBe('Set 1, 1 kilogram, 1 rep');
    expect(setLabel(1, { weight: 82.5, reps: 5, previous: null })).toBe('Set 1, 82.5 kilograms, 5 reps');
  });

  it('says when a set is empty or partly filled', () => {
    expect(setLabel(3, { weight: null, reps: null, previous: null })).toBe('Set 3, not logged yet');
    expect(setLabel(3, { weight: null, reps: 12, previous: null })).toBe('Set 3, 12 reps');
  });

  it('adds done during a workout', () => {
    expect(setLabel(1, { weight: 60, reps: 10, previous: null }, true)).toBe('Set 1, 60 kilograms, 10 reps, done');
  });
});
