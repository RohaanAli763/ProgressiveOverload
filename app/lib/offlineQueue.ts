import type { ExerciseSet, WorkoutDay } from '../screens/Home';

// Gyms often have bad signal (a situational constraint). Set saves and deletes made while
// offline are queued on the phone and sent in order when the connection comes back.
// This file is the pure part (no storage, no network) so it can be unit-tested;
// app/services/offlineSync.ts runs it.

export type QueuedLog = { weight: number; reps: number; loggedAt: string };

export type QueuedUpsert = {
  id: string;
  kind: 'upsertSet';
  exerciseId: string;
  set: ExerciseSet; // set.id may be a temp 'new-' id until the insert goes through
  log: QueuedLog | null; // set_logs entry to write after the set (null for auto-saves)
  createdAt: string;
};

export type QueuedDelete = { id: string; kind: 'deleteSet'; setId: string; createdAt: string };

export type QueuedWrite = QueuedUpsert | QueuedDelete;

const isTemp = (id: string) => id.startsWith('new-');

// Adds a set save. A later save of the same set replaces the earlier one (only the latest values
// matter), unless that entry is being sent right now (`lockedId`): then it is appended after it.
export function enqueueUpsert(
  queue: QueuedWrite[],
  entry: Omit<QueuedUpsert, 'kind'>,
  lockedId?: string
): QueuedWrite[] {
  const i = queue.findIndex((w) => w.kind === 'upsertSet' && w.set.id === entry.set.id && w.id !== lockedId);
  const next: QueuedUpsert = { ...entry, kind: 'upsertSet' };
  if (i === -1) return [...queue, next];
  const prev = queue[i] as QueuedUpsert;
  const merged: QueuedUpsert = { ...next, id: prev.id, log: entry.log ?? prev.log, createdAt: prev.createdAt };
  return queue.map((w, j) => (j === i ? merged : w));
}

// Adds a set delete. Pending saves of that set are dropped. A set that never reached the server
// (temp id, no save in flight) needs no server delete at all.
export function enqueueDelete(
  queue: QueuedWrite[],
  entry: { id: string; setId: string; createdAt: string },
  lockedId?: string
): QueuedWrite[] {
  const inFlight = queue.some((w) => w.id === lockedId && w.kind === 'upsertSet' && w.set.id === entry.setId);
  const kept = queue.filter((w) => w.id === lockedId || !(w.kind === 'upsertSet' && w.set.id === entry.setId));
  if (isTemp(entry.setId) && !inFlight) return kept;
  return [...kept, { ...entry, kind: 'deleteSet' }];
}

// After a temp set is inserted, point later entries at its real id.
export function remapIds(queue: QueuedWrite[], idMap: Record<string, string>): QueuedWrite[] {
  return queue.map((w) => {
    if (w.kind === 'upsertSet' && idMap[w.set.id]) return { ...w, set: { ...w.set, id: idMap[w.set.id] } };
    if (w.kind === 'deleteSet' && idMap[w.setId]) return { ...w, setId: idMap[w.setId] };
    return w;
  });
}

export function pendingSetIds(queue: QueuedWrite[]): Set<string> {
  return new Set(queue.map((w) => (w.kind === 'upsertSet' ? w.set.id : w.setId)));
}

export function pendingCount(queue: QueuedWrite[]): number {
  return queue.length;
}

// Shows queued changes on top of what the server returned, so a re-opened workout
// doesn't look like it lost the sets that are still waiting to sync.
export function applyPending(day: WorkoutDay, queue: QueuedWrite[]): WorkoutDay {
  if (queue.length === 0) return day;
  const deleted = new Set(queue.filter((w) => w.kind === 'deleteSet').map((w) => (w as QueuedDelete).setId));
  const upserts = queue.filter((w): w is QueuedUpsert => w.kind === 'upsertSet');
  return {
    ...day,
    muscleGroups: day.muscleGroups.map((mg) => ({
      ...mg,
      exercises: mg.exercises.map((ex) => {
        let sets = (ex.sets ?? []).filter((s) => !deleted.has(s.id));
        for (const u of upserts.filter((w) => w.exerciseId === ex.id)) {
          const i = sets.findIndex((s) => s.id === u.set.id || s.setNumber === u.set.setNumber);
          sets = i === -1 ? [...sets, u.set] : sets.map((s, j) => (j === i ? { ...u.set, id: s.id === u.set.id ? s.id : u.set.id } : s));
        }
        return { ...ex, sets: [...sets].sort((a, b) => a.setNumber - b.setNumber) };
      }),
    })),
  };
}

// Reads the stored queue, dropping anything malformed instead of crashing on start.
export function parseQueue(raw: string | null): QueuedWrite[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (w) =>
        w &&
        typeof w.id === 'string' &&
        ((w.kind === 'upsertSet' && typeof w.exerciseId === 'string' && w.set && typeof w.set.id === 'string') ||
          (w.kind === 'deleteSet' && typeof w.setId === 'string'))
    );
  } catch {
    return [];
  }
}
