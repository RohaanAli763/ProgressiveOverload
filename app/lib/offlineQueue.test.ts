import {
  applyPending,
  enqueueDelete,
  enqueueUpsert,
  parseQueue,
  pendingSetIds,
  remapIds,
  type QueuedUpsert,
  type QueuedWrite,
} from './offlineQueue';
import type { ExerciseSet, WorkoutDay } from '../screens/Home';

const set = (id: string, setNumber: number, weight: number, reps: number): ExerciseSet => ({
  id,
  exerciseId: 'ex1',
  setNumber,
  weight,
  reps,
  previous: null,
});
const T = '2026-11-24T18:00:00.000Z';
const up = (qid: string, s: ExerciseSet, log: QueuedUpsert['log'] = null) => ({
  id: qid,
  exerciseId: 'ex1',
  set: s,
  log,
  createdAt: T,
});

describe('enqueueUpsert', () => {
  it('appends a new set save', () => {
    const q = enqueueUpsert([], up('q1', set('new-a', 1, 80, 8)));
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ kind: 'upsertSet', set: { id: 'new-a', weight: 80 } });
  });

  it('replaces an earlier save of the same set, keeping its place and log', () => {
    const log = { weight: 80, reps: 8, loggedAt: T };
    let q = enqueueUpsert([], up('q1', set('s1', 1, 80, 8), log));
    q = enqueueUpsert(q, up('q2', set('s2', 2, 60, 10)));
    q = enqueueUpsert(q, up('q3', set('s1', 1, 82.5, 8)));
    expect(q.map((w) => w.id)).toEqual(['q1', 'q2']);
    expect((q[0] as QueuedUpsert).set.weight).toBe(82.5);
    expect((q[0] as QueuedUpsert).log).toEqual(log);
  });

  it('does not touch the entry being sent right now', () => {
    let q = enqueueUpsert([], up('q1', set('new-a', 1, 80, 8)));
    q = enqueueUpsert(q, up('q2', set('new-a', 1, 85, 8)), 'q1');
    expect(q.map((w) => w.id)).toEqual(['q1', 'q2']);
    expect((q[0] as QueuedUpsert).set.weight).toBe(80);
  });
});

describe('enqueueDelete', () => {
  it('drops pending saves and skips the server for a set that never synced', () => {
    const q = enqueueUpsert([], up('q1', set('new-a', 1, 80, 8)));
    expect(enqueueDelete(q, { id: 'd1', setId: 'new-a', createdAt: T })).toEqual([]);
  });

  it('queues a server delete for a real set and drops its pending save', () => {
    const q = enqueueUpsert([], up('q1', set('s1', 1, 80, 8)));
    expect(enqueueDelete(q, { id: 'd1', setId: 's1', createdAt: T })).toEqual([
      { id: 'd1', kind: 'deleteSet', setId: 's1', createdAt: T },
    ]);
  });

  it('keeps an in-flight insert and deletes after it', () => {
    const q = enqueueUpsert([], up('q1', set('new-a', 1, 80, 8)));
    const out = enqueueDelete(q, { id: 'd1', setId: 'new-a', createdAt: T }, 'q1');
    expect(out.map((w) => w.kind)).toEqual(['upsertSet', 'deleteSet']);
  });
});

describe('remapIds', () => {
  it('points later entries at the real id', () => {
    const q: QueuedWrite[] = [
      { kind: 'upsertSet', ...up('q2', set('new-a', 1, 85, 8)) },
      { id: 'd1', kind: 'deleteSet', setId: 'new-a', createdAt: T },
      { kind: 'upsertSet', ...up('q3', set('s9', 2, 60, 10)) },
    ];
    const out = remapIds(q, { 'new-a': 'real-1' });
    expect(pendingSetIds(out)).toEqual(new Set(['real-1', 's9']));
  });
});

describe('applyPending', () => {
  const day: WorkoutDay = {
    id: 'd',
    name: 'Push',
    note: '',
    icon: 'fitness-center',
    muscleGroups: [
      {
        id: 'mg',
        name: 'Chest',
        exercises: [{ id: 'ex1', name: 'Bench', prescription: '', sets: [set('s1', 1, 80, 8), set('s2', 2, 80, 8)] }],
      },
    ],
  };

  it('returns the same day when nothing is queued', () => {
    expect(applyPending(day, [])).toBe(day);
  });

  it('overlays queued edits, new sets and deletes', () => {
    let q = enqueueUpsert([], up('q1', set('s1', 1, 82.5, 8)));
    q = enqueueUpsert(q, up('q2', set('new-a', 3, 80, 6)));
    q = enqueueDelete(q, { id: 'd1', setId: 's2', createdAt: T });
    const sets = applyPending(day, q).muscleGroups[0].exercises[0].sets!;
    expect(sets.map((s) => [s.id, s.setNumber, s.weight, s.reps])).toEqual([
      ['s1', 1, 82.5, 8],
      ['new-a', 3, 80, 6],
    ]);
  });

  it('matches a synced row by set number so a queued retry does not duplicate it', () => {
    const q = enqueueUpsert([], up('q1', set('new-b', 2, 90, 5)));
    const sets = applyPending(day, q).muscleGroups[0].exercises[0].sets!;
    expect(sets).toHaveLength(2);
    expect(sets[1]).toMatchObject({ setNumber: 2, weight: 90 });
  });
});

describe('parseQueue', () => {
  it('drops junk and keeps valid entries', () => {
    const good = { kind: 'upsertSet', ...up('q1', set('s1', 1, 80, 8)) };
    const raw = JSON.stringify([good, { kind: 'deleteSet' }, null, 5, { id: 'd', kind: 'deleteSet', setId: 'x', createdAt: T }]);
    expect(parseQueue(raw).map((w) => w.id)).toEqual(['q1', 'd']);
    expect(parseQueue('nope')).toEqual([]);
    expect(parseQueue(null)).toEqual([]);
    expect(parseQueue('{}')).toEqual([]);
  });
});
