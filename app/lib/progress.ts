import { toLocalDateStr } from './commits';

// Pure progress maths over set_logs: estimated 1RM, personal records, per-day series, streaks.
// Dates are bucketed by LOCAL day (toLocalDateStr), not UTC.

export type SetLog = {
  id: string;
  exerciseId: string;
  exerciseName: string | null;
  setId: string | null;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  loggedAt: string; // ISO
};

export type Best = { bestWeight: number; bestE1rm: number };

export type PrKind = 'weight' | 'e1rm';

export type DayPoint = {
  date: string; // YYYY-MM-DD local
  bestWeight: number;
  bestE1rm: number;
  topWeight: number; // the set with the best e1RM that day
  topReps: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

// Epley estimate of the one-rep max. Lets "80 x 10" and "90 x 5" be compared on one line.
export function e1rm(weight: number | null, reps: number | null): number {
  if (weight === null || reps === null || weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return round1(weight * (1 + reps / 30));
}

export function bestsByExercise(logs: SetLog[]): Record<string, Best> {
  const out: Record<string, Best> = {};
  for (const l of logs) {
    if (l.weight === null || l.reps === null || l.reps <= 0) continue;
    const b = out[l.exerciseId] ?? { bestWeight: 0, bestE1rm: 0 };
    out[l.exerciseId] = {
      bestWeight: Math.max(b.bestWeight, l.weight),
      bestE1rm: Math.max(b.bestE1rm, e1rm(l.weight, l.reps)),
    };
  }
  return out;
}

// A PR is a heavier weight than ever, or a better e1RM (e.g. more reps at a top weight).
// The very first log of an exercise is not a PR, so a new exercise doesn't spam trophies.
export function detectPR(best: Best | undefined, weight: number, reps: number): PrKind | null {
  if (!best || reps <= 0 || weight <= 0) return null;
  if (weight > best.bestWeight) return 'weight';
  if (e1rm(weight, reps) > best.bestE1rm) return 'e1rm';
  return null;
}

export function applyToBest(best: Best | undefined, weight: number, reps: number): Best {
  const b = best ?? { bestWeight: 0, bestE1rm: 0 };
  return { bestWeight: Math.max(b.bestWeight, weight), bestE1rm: Math.max(b.bestE1rm, e1rm(weight, reps)) };
}

// One point per local day for one exercise, oldest first.
export function dailySeries(logs: SetLog[]): DayPoint[] {
  const byDay: Record<string, DayPoint> = {};
  for (const l of logs) {
    if (l.weight === null || l.reps === null || l.reps <= 0) continue;
    const date = toLocalDateStr(new Date(l.loggedAt));
    const est = e1rm(l.weight, l.reps);
    const p = byDay[date];
    if (!p) {
      byDay[date] = { date, bestWeight: l.weight, bestE1rm: est, topWeight: l.weight, topReps: l.reps };
    } else {
      p.bestWeight = Math.max(p.bestWeight, l.weight);
      if (est > p.bestE1rm) {
        p.bestE1rm = est;
        p.topWeight = l.weight;
        p.topReps = l.reps;
      }
    }
  }
  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

// Plain-language trend, also what TalkBack reads instead of the chart.
export function trendSummary(series: DayPoint[]): string {
  if (series.length < 2) return series.length === 1 ? 'First session logged' : 'No sessions yet';
  const first = series[0];
  const last = series[series.length - 1];
  const diff = round1(last.bestWeight - first.bestWeight);
  const days = daysBetween(first.date, last.date);
  const span = days < 14 ? `${days} ${days === 1 ? 'day' : 'days'}` : `${Math.round(days / 7)} weeks`;
  if (diff > 0) return `Up ${diff} kg in ${span}`;
  if (diff < 0) return `Down ${-diff} kg in ${span}`;
  return `Same top weight over ${span}`;
}

// Monday-based week start for a local date string.
function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const shift = (dt.getDay() + 6) % 7; // Mon=0 ... Sun=6
  dt.setDate(dt.getDate() - shift);
  return toLocalDateStr(dt);
}

// Workout days this week and how many weeks in a row had at least one.
// An empty current week doesn't break the streak yet (the week isn't over).
export function weekStats(logDates: string[], today: Date): { daysThisWeek: number; streakWeeks: number } {
  const days = new Set(logDates);
  const weeks = new Set([...days].map(weekStart));
  const thisWeek = weekStart(toLocalDateStr(today));
  const daysThisWeek = [...days].filter((d) => weekStart(d) === thisWeek).length;

  const cursor = new Date(Number(thisWeek.slice(0, 4)), Number(thisWeek.slice(5, 7)) - 1, Number(thisWeek.slice(8, 10)));
  if (!weeks.has(thisWeek)) cursor.setDate(cursor.getDate() - 7);
  let streakWeeks = 0;
  while (weeks.has(toLocalDateStr(cursor))) {
    streakWeeks++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return { daysThisWeek, streakWeeks };
}

export type ExerciseOverview = {
  exerciseId: string;
  name: string;
  sessions: number;
  lastDate: string;
  bestWeight: number;
  trend: string;
};

// One row per logged exercise for the History list, most recently trained first.
export function exerciseOverviews(logs: SetLog[]): ExerciseOverview[] {
  const groups: Record<string, SetLog[]> = {};
  for (const l of logs) (groups[l.exerciseId] ??= []).push(l);
  return Object.entries(groups)
    .map(([exerciseId, list]) => {
      const series = dailySeries(list);
      return {
        exerciseId,
        name: list.find((l) => l.exerciseName)?.exerciseName ?? 'Deleted exercise',
        sessions: series.length,
        lastDate: series.length ? series[series.length - 1].date : '',
        bestWeight: series.reduce((m, p) => Math.max(m, p.bestWeight), 0),
        trend: trendSummary(series),
      };
    })
    .filter((o) => o.sessions > 0)
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-11-03" -> "Nov 3" (chart labels, session list).
export function shortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}`;
}
