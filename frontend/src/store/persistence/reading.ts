import { STORAGE_KEYS } from '@/store/storageKeys';
import { createSyncStore } from '@/store/createSyncStore';
import { readStorageJson } from './storage';

/**
 * Which lessons the learner has read. A read lesson satisfies the prerequisite
 * MasteryLookup and counts toward course completion. localStorage-only for now
 * (the `lesson_reads` server table exists; a sync adapter can layer on later).
 */
export interface ReadingData {
  /** itemId → epoch ms when marked read. */
  readings: Record<string, number>;
}

const KEY = STORAGE_KEYS.READINGS;

function normalizeId(id: string): string | null {
  const trimmed = id.trim();
  return trimmed || null;
}

function isReadingData(value: unknown): value is ReadingData {
  if (!value || typeof value !== 'object') return false;
  const r = (value as Partial<ReadingData>).readings;
  if (!r || typeof r !== 'object') return false;
  return Object.values(r).every((n) => typeof n === 'number' && Number.isFinite(n));
}

function load(): ReadingData {
  const raw = readStorageJson<ReadingData>(KEY, { readings: {} }, isReadingData);
  const readings: Record<string, number> = {};
  for (const [id, at] of Object.entries(raw.readings)) {
    const key = normalizeId(id);
    if (key && at > 0) readings[key] = Math.round(at);
  }
  return { readings };
}

const store = createSyncStore<ReadingData>(KEY, load);

export function useReadings(): ReadingData {
  return store.use();
}

export function markRead(itemId: string): void {
  const id = normalizeId(itemId);
  if (!id) return;
  store.update((d) => (d.readings[id] ? d : { readings: { ...d.readings, [id]: Date.now() } }));
}

export function unmarkRead(itemId: string): void {
  const id = normalizeId(itemId);
  if (!id) return;
  store.update((d) => {
    if (!d.readings[id]) return d;
    const next = { ...d.readings };
    delete next[id];
    return { readings: next };
  });
}

export function isRead(itemId: string): boolean {
  const id = normalizeId(itemId);
  return id ? !!store.get().readings[id] : false;
}

export function readFor(data: ReadingData, itemId: string): boolean {
  const id = normalizeId(itemId);
  return id ? !!data.readings[id] : false;
}
