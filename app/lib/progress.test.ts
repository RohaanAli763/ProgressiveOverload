import {
  applyToBest,
  bestsByExercise,
  dailySeries,
  detectPR,
  e1rm,
  exerciseOverviews,
  shortDate,
  trendSummary,
  weekStats,
  type SetLog,
} from './progress';

// Local-time ISO string so tests don't depend on the machine's timezone.
const at = (y: number, m: number, d: number, h = 18) => new Date(y, m - 1, d, h).toISOString();

let n = 0;
const log = (exerciseId: string, weight: number | null, reps: number | null, loggedAt: string, name = 'Bench'): SetLog => ({
  id: `l${n++}`,
  exerciseId,
  exerciseName: name,
  setId: null,
  setNumber: 1,
  weight,
  reps,
  loggedAt,
});

describe('e1rm', () => {
  it('uses Epley, 1 rep = the weight itself', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(80, 10)).toBe(106.7);
    expect(e1rm(90, 5)).toBe(105);
  });
  it('is 0 for empty or bodyweight sets', () => {
    expect(e1rm(null, 8)).toBe(0);
    expect(e1rm(0, 8)).toBe(0);
    expect(e1rm(80, 0)).toBe(0);
  });
});

describe('bestsByExercise / detectPR', () => {
  const logs = [log('a', 80, 8, at(2026, 11, 1)), log('a', 85, 3, at(2026, 11, 8)), log('a', null, null, at(2026, 11, 9))];
  const best = bestsByExercise(logs).a;

  it('finds best weight and best e1RM separately', () => {
    expect(best).toEqual({ bestWeight: 85, bestE1rm: 101.3 });
  });

  it('flags a heavier weight', () => {
    expect(detectPR(best, 87.5, 1)).toBe('weight');
  });

  it('flags more reps at a top weight via e1RM', () => {
    expect(detectPR(best, 80, 10)).toBe('e1rm');
  });

  it('does not flag equal or worse sets, or a first-ever log', () => {
    expect(detectPR(best, 85, 3)).toBeNull();
    expect(detectPR(best, 80, 8)).toBeNull();
    expect(detectPR(undefined, 100, 5)).toBeNull();
  });

  it('applyToBest raises the bar', () => {
    expect(applyToBest(best, 90, 1)).toEqual({ bestWeight: 90, bestE1rm: 101.3 });
    expect(applyToBest(undefined, 60, 1)).toEqual({ bestWeight: 60, bestE1rm: 60 });
  });
});

describe('dailySeries', () => {
  it('keeps one point per local day with the top set', () => {
    const series = dailySeries([
      log('a', 80, 8, at(2026, 11, 3, 9)),
      log('a', 90, 3, at(2026, 11, 3, 10)),
      log('a', 82.5, 8, at(2026, 11, 1)),
    ]);
    expect(series).toEqual([
      { date: '2026-11-01', bestWeight: 82.5, bestE1rm: 104.5, topWeight: 82.5, topReps: 8 },
      { date: '2026-11-03', bestWeight: 90, bestE1rm: 101.3, topWeight: 80, topReps: 8 },
    ]);
  });
});

describe('trendSummary', () => {
  const p = (date: string, bestWeight: number) => ({ date, bestWeight, bestE1rm: 0, topWeight: 0, topReps: 0 });
  it('describes the change over time', () => {
    expect(trendSummary([p('2026-10-01', 70), p('2026-11-12', 80)])).toBe('Up 10 kg in 6 weeks');
    expect(trendSummary([p('2026-11-01', 80), p('2026-11-04', 77.5)])).toBe('Down 2.5 kg in 3 days');
    expect(trendSummary([p('2026-11-01', 80), p('2026-11-02', 80)])).toBe('Same top weight over 1 day');
  });
  it('handles short histories', () => {
    expect(trendSummary([])).toBe('No sessions yet');
    expect(trendSummary([p('2026-11-01', 80)])).toBe('First session logged');
  });
});

describe('weekStats', () => {
  const today = new Date(2026, 10, 26); // Thu 26 Nov 2026
  it('counts days this week and consecutive weeks', () => {
    const dates = ['2026-11-23', '2026-11-25', '2026-11-25', '2026-11-17', '2026-11-10', '2026-10-27'];
    expect(weekStats(dates, today)).toEqual({ daysThisWeek: 2, streakWeeks: 3 });
  });
  it('an empty current week keeps last week alive', () => {
    expect(weekStats(['2026-11-17', '2026-11-10'], today)).toEqual({ daysThisWeek: 0, streakWeeks: 2 });
  });
  it('is zero with no logs', () => {
    expect(weekStats([], today)).toEqual({ daysThisWeek: 0, streakWeeks: 0 });
  });
});

describe('exerciseOverviews', () => {
  it('groups by exercise, most recent first', () => {
    const rows = exerciseOverviews([
      log('a', 80, 8, at(2026, 11, 1), 'Bench'),
      log('a', 85, 8, at(2026, 11, 8), 'Bench'),
      log('b', 100, 5, at(2026, 11, 10), 'Squat'),
      log('c', null, null, at(2026, 11, 11), 'Empty'),
    ]);
    expect(rows.map((r) => [r.name, r.sessions, r.bestWeight, r.trend])).toEqual([
      ['Squat', 1, 100, 'First session logged'],
      ['Bench', 2, 85, 'Up 5 kg in 7 days'],
    ]);
  });
});

describe('shortDate', () => {
  it('formats a local date string', () => {
    expect(shortDate('2026-11-03')).toBe('Nov 3');
    expect(shortDate('2027-01-21')).toBe('Jan 21');
  });
});
