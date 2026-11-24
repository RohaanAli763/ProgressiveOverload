import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import type { ExerciseSet, WorkoutDay } from '../screens/Home';
import { deleteSingleSet, logSet, upsertSetByNumber, upsertSingleSet } from './workoutService';
import {
  enqueueDelete,
  enqueueUpsert,
  parseQueue,
  pendingSetIds,
  remapIds,
  type QueuedLog,
  type QueuedWrite,
} from '../lib/offlineQueue';

// Offline-first set saving. Screens call saveSet / deleteSet instead of the raw service calls:
// online, they write straight through; offline (or while older writes are still queued),
// they go into a queue stored on the phone that is flushed in order when the connection returns.

const STORAGE_KEY = 'gymyaki.offlineQueue';

let queue: QueuedWrite[] = [];
let online = true;
let flushing = false;
let inFlightId: string | undefined;
let started = false;
// temp 'new-' id -> real DB id, for sets inserted by a flush (screens may still hold the temp id)
const resolved: Record<string, string> = {};

type Status = { online: boolean; pending: number };
let status: Status = { online: true, pending: 0 };
const statusListeners = new Set<() => void>();
const idListeners = new Set<(map: Record<string, string>) => void>();

const uid = () => `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function notify() {
  const next = { online, pending: queue.length };
  if (next.online !== status.online || next.pending !== status.pending) {
    status = next;
    statusListeners.forEach((l) => l());
  }
}

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue)).catch((err) =>
    console.error('[Offline] Failed to store queue:', err)
  );
}

function isOnline(state: NetInfoState): boolean {
  // isInternetReachable is null while unknown: don't treat that as offline.
  return state.isConnected !== false && state.isInternetReachable !== false;
}

async function refreshOnline() {
  try {
    online = isOnline(await NetInfo.fetch());
  } catch {
    // keep the last known value
  }
  notify();
}

// Call once at app start (Main). Loads the stored queue and starts watching the connection.
export async function initOfflineSync(): Promise<void> {
  if (started) return;
  started = true;
  try {
    queue = parseQueue(await AsyncStorage.getItem(STORAGE_KEY));
  } catch (err) {
    console.error('[Offline] Failed to load queue:', err);
  }
  NetInfo.addEventListener((state) => {
    const was = online;
    online = isOnline(state);
    notify();
    if (online && !was) void flush();
  });
  AppState.addEventListener('change', (s) => {
    if (s === 'active') void flush();
  });
  await refreshOnline();
  void flush();
}

export function getQueue(): QueuedWrite[] {
  return queue;
}

// Called with {tempId: realId} each time a queued new set gets its database id.
export function subscribeIdChanges(fn: (map: Record<string, string>) => void): () => void {
  idListeners.add(fn);
  return () => {
    idListeners.delete(fn);
  };
}

function subscribeStatus(fn: () => void) {
  statusListeners.add(fn);
  return () => {
    statusListeners.delete(fn);
  };
}

// { online, pending } for the "Offline · 3 waiting" pill.
export function useSyncStatus(): Status {
  return useSyncExternalStore(subscribeStatus, () => status);
}

export type SaveResult = { status: 'saved' | 'queued' | 'failed'; savedId: string };

// Save one set (plus its set_logs entry when `log` is given).
export async function saveSet(exerciseId: string, input: ExerciseSet, log: QueuedLog | null): Promise<SaveResult> {
  const set = { ...input, id: resolved[input.id] ?? input.id };
  const hasPending = pendingSetIds(queue).has(set.id);

  if (online && !hasPending) {
    const r = await upsertSingleSet(exerciseId, set);
    if (r.success) {
      if (log) void logSet({ exerciseId, setId: r.savedId, setNumber: set.setNumber, ...log });
      return { status: 'saved', savedId: r.savedId };
    }
    await refreshOnline();
    if (online) return { status: 'failed', savedId: set.id }; // a real error, not the connection
  }

  queue = enqueueUpsert(queue, { id: uid(), exerciseId, set, log, createdAt: new Date().toISOString() }, inFlightId);
  persist();
  notify();
  if (online) void flush();
  return { status: 'queued', savedId: set.id };
}

// Delete one set. Returns false only for a real (online) failure.
export async function deleteSet(inputId: string): Promise<boolean> {
  const setId = resolved[inputId] ?? inputId;
  const hasPending = pendingSetIds(queue).has(setId);
  if (!hasPending && setId.startsWith('new-')) return true; // never reached the server

  if (online && !hasPending) {
    if (await deleteSingleSet(setId)) return true;
    await refreshOnline();
    if (online) return false;
  }

  queue = enqueueDelete(queue, { id: uid(), setId, createdAt: new Date().toISOString() }, inFlightId);
  persist();
  notify();
  if (online) void flush();
  return true;
}

// Sends queued writes oldest first. Stops at the first failure and retries on the next trigger
// (reconnect, app back in front, next save), so the order is always kept.
export async function flush(): Promise<void> {
  if (flushing || !online || queue.length === 0) return;
  flushing = true;
  try {
    while (queue.length > 0 && online) {
      const w = queue[0];
      inFlightId = w.id;
      if (w.kind === 'upsertSet') {
        const isTemp = w.set.id.startsWith('new-');
        const r = isTemp ? await upsertSetByNumber(w.exerciseId, w.set) : await upsertSingleSet(w.exerciseId, w.set);
        if (!r.success) break;
        let rest = queue.slice(1);
        if (isTemp) {
          resolved[w.set.id] = r.savedId;
          rest = remapIds(rest, { [w.set.id]: r.savedId });
          idListeners.forEach((l) => l({ [w.set.id]: r.savedId }));
        }
        queue = rest;
        if (w.log) void logSet({ exerciseId: w.exerciseId, setId: r.savedId, setNumber: w.set.setNumber, ...w.log });
      } else {
        if (!(await deleteSingleSet(w.setId))) break;
        queue = queue.slice(1);
      }
      persist();
      notify();
    }
  } finally {
    inFlightId = undefined;
    flushing = false;
    notify();
  }
}

// ── Workout list cache ─────────────────────────────────────────────────────────
// So the app still opens with your routines in a basement gym. fetchWorkoutDays returns []
// both for "no days" and for "request failed", so an empty result only replaces the cache
// when we're actually online.

const DAYS_CACHE_KEY = 'gymyaki.workoutDaysCache';

export async function loadCachedWorkoutDays(): Promise<WorkoutDay[]> {
  try {
    const raw = await AsyncStorage.getItem(DAYS_CACHE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Returns the list to show: the fresh one, or null to keep what's on screen (offline).
export async function acceptFetchedWorkoutDays(days: WorkoutDay[]): Promise<WorkoutDay[] | null> {
  if (days.length === 0) {
    await refreshOnline();
    if (!online) return null;
  }
  AsyncStorage.setItem(DAYS_CACHE_KEY, JSON.stringify(days)).catch((err) =>
    console.error('[Offline] Failed to cache workout days:', err)
  );
  return days;
}
