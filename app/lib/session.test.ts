import {
  doneKey,
  formatClock,
  formatThousands,
  isImprovement,
  remainingSec,
  spokenDuration,
  summarizeSession,
  type DoneSet,
} from './session';

describe('isImprovement', () => {
  it('counts heavier weight', () => {
    expect(isImprovement(80, 8, 82.5, 6)).toBe(true);
  });
  it('counts more reps at the same weight', () => {
    expect(isImprovement(80, 8, 80, 9)).toBe(true);
  });
  it('does not count same, fewer reps, or lighter', () => {
    expect(isImprovement(80, 8, 80, 8)).toBe(false);
    expect(isImprovement(80, 8, 80, 7)).toBe(false);
    expect(isImprovement(80, 8, 77.5, 12)).toBe(false);
  });
  it('does not count sets with no history', () => {
    expect(isImprovement(null, null, 80, 8)).toBe(false);
    expect(isImprovement(80, null, 85, 8)).toBe(false);
  });
});

describe('summarizeSession', () => {
  const done: DoneSet[] = [
    { exerciseId: 'a', weight: 80, reps: 8, beforeWeight: 80, beforeReps: 7 },
    { exerciseId: 'a', weight: 80, reps: 8, beforeWeight: 80, beforeReps: 8 },
    { exerciseId: 'b', weight: 22.5, reps: 10, beforeWeight: null, beforeReps: null },
  ];

  it('adds up sets, volume, exercises and improvements', () => {
    expect(summarizeSession(done, 0, 45 * 60 * 1000)).toEqual({
      durationSec: 2700,
      sets: 3,
      volume: 80 * 8 * 2 + 225,
      exercises: 2,
      improvedSets: 1,
    });
  });

  it('handles an empty workout', () => {
    expect(summarizeSession([], 1000, 500)).toEqual({
      durationSec: 0,
      sets: 0,
      volume: 0,
      exercises: 0,
      improvedSets: 0,
    });
  });
});

describe('remainingSec', () => {
  it('rounds up and never goes negative', () => {
    expect(remainingSec(10_000, 0)).toBe(10);
    expect(remainingSec(10_000, 9_001)).toBe(1);
    expect(remainingSec(10_000, 10_000)).toBe(0);
    expect(remainingSec(10_000, 12_000)).toBe(0);
  });
});

describe('formatClock', () => {
  it('formats minutes and hours', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(725)).toBe('12:05');
    expect(formatClock(3729)).toBe('1:02:09');
  });
});

describe('spokenDuration', () => {
  it('reads naturally', () => {
    expect(spokenDuration(90)).toBe('1 minute 30 seconds');
    expect(spokenDuration(60)).toBe('1 minute');
    expect(spokenDuration(1)).toBe('1 second');
    expect(spokenDuration(0)).toBe('0 seconds');
    expect(spokenDuration(3720)).toBe('1 hour 2 minutes');
  });
});

describe('formatThousands', () => {
  it('adds separators', () => {
    expect(formatThousands(4250)).toBe('4,250');
    expect(formatThousands(1234567.5)).toBe('1,234,567.5');
    expect(formatThousands(999)).toBe('999');
  });
});

describe('doneKey', () => {
  it('combines exercise and set number', () => {
    expect(doneKey('ex1', 3)).toBe('ex1:3');
  });
});
