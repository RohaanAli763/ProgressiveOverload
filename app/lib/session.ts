// Pure helpers for an in-progress workout ("gym mode"): rest timing and the end-of-workout summary.

export const DEFAULT_REST_SEC = 90;
export const REST_ADJUST_SEC = 15;
export const MIN_REST_SEC = 15;

// A set ticked off during the workout. `before*` are the set's values before this workout
// (null for a set added today), used to count sets that beat last time.
export type DoneSet = {
  exerciseId: string;
  weight: number;
  reps: number;
  beforeWeight: number | null;
  beforeReps: number | null;
};

export type SessionSummary = {
  durationSec: number;
  sets: number;
  volume: number; // kg, sum of weight x reps
  exercises: number;
  improvedSets: number;
};

// Same key for a set across the temp id -> DB id swap on insert (set_number is unique per exercise).
export function doneKey(exerciseId: string, setNumber: number): string {
  return `${exerciseId}:${setNumber}`;
}

// Progressive overload: heavier, or same weight for more reps.
export function isImprovement(
  beforeWeight: number | null,
  beforeReps: number | null,
  weight: number,
  reps: number
): boolean {
  if (beforeWeight === null || beforeReps === null) return false;
  return weight > beforeWeight || (weight === beforeWeight && reps > beforeReps);
}

export function summarizeSession(done: DoneSet[], startedAt: number, endedAt: number): SessionSummary {
  return {
    durationSec: Math.max(0, Math.round((endedAt - startedAt) / 1000)),
    sets: done.length,
    volume: Math.round(done.reduce((sum, d) => sum + d.weight * d.reps, 0) * 100) / 100,
    exercises: new Set(done.map((d) => d.exerciseId)).size,
    improvedSets: done.filter((d) => isImprovement(d.beforeWeight, d.beforeReps, d.weight, d.reps)).length,
  };
}

// Seconds left until `endAt` (ms timestamp), rounded up so the display shows 1 until it really ends.
export function remainingSec(endAt: number, now: number): number {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

// "1:30", "12:05", "1:02:09"
export function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// What TalkBack reads instead of "1:30".
export function spokenDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`);
  if (m) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
  if (s || parts.length === 0) parts.push(`${s} ${s === 1 ? 'second' : 'seconds'}`);
  return parts.join(' ');
}

// "4250" -> "4,250" (no Intl dependency).
export function formatThousands(n: number): string {
  const [int, dec] = String(Math.round(n * 100) / 100).split('.');
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec ? `${withCommas}.${dec}` : withCommas;
}
