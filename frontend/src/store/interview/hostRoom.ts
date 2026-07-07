import { readStorageText, removeStorageValue, writeStorageText } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';

/** Pre-Wave-8 key — migrated once on read. */
const LEGACY_INTERVIEW_HOST_KEY = 'algo-moves-interview-host';

function normalizeRoom(room: string): string {
  return room.trim().toUpperCase();
}

function readPersistedHostRoom(): string | null {
  const current = readStorageText(STORAGE_KEYS.INTERVIEW_HOST_ROOM, null);
  if (current) return current;
  const legacy = readStorageText(LEGACY_INTERVIEW_HOST_KEY, null);
  if (!legacy) return null;
  const normalized = normalizeRoom(legacy);
  writeStorageText(STORAGE_KEYS.INTERVIEW_HOST_ROOM, normalized);
  removeStorageValue(LEGACY_INTERVIEW_HOST_KEY);
  return normalized;
}

export function markInterviewHostRoom(room: string): void {
  writeStorageText(STORAGE_KEYS.INTERVIEW_HOST_ROOM, normalizeRoom(room));
}

export function isPersistedInterviewHostRoom(room: string | null | undefined): boolean {
  if (!room) return false;
  const saved = readPersistedHostRoom();
  return saved === normalizeRoom(room);
}

export function clearInterviewHostRoom(): void {
  removeStorageValue(STORAGE_KEYS.INTERVIEW_HOST_ROOM);
  removeStorageValue(LEGACY_INTERVIEW_HOST_KEY);
}
