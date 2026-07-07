import { readStorageText, removeStorageValue, writeStorageText } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';

/** Pre-Wave-8 key — migrated once on read. */
const LEGACY_INTERVIEW_HOST_KEY = 'algo-moves-interview-host';
const ROOM_ID_PATTERN = /^[A-Z0-9-]{3,64}$/;

function normalizeRoom(room: string | null | undefined): string | null {
  const normalized = room?.trim().toUpperCase().replace(/\s+/g, '-') ?? '';
  return ROOM_ID_PATTERN.test(normalized) ? normalized : null;
}

function readPersistedHostRoom(): string | null {
  const current = readStorageText(STORAGE_KEYS.INTERVIEW_HOST_ROOM, null);
  const normalizedCurrent = normalizeRoom(current);
  if (normalizedCurrent) return normalizedCurrent;
  if (current) removeStorageValue(STORAGE_KEYS.INTERVIEW_HOST_ROOM);
  const legacy = readStorageText(LEGACY_INTERVIEW_HOST_KEY, null);
  if (!legacy) return null;
  const normalized = normalizeRoom(legacy);
  if (normalized) writeStorageText(STORAGE_KEYS.INTERVIEW_HOST_ROOM, normalized);
  removeStorageValue(LEGACY_INTERVIEW_HOST_KEY);
  return normalized;
}

export function markInterviewHostRoom(room: string): void {
  const normalized = normalizeRoom(room);
  if (normalized) {
    writeStorageText(STORAGE_KEYS.INTERVIEW_HOST_ROOM, normalized);
    return;
  }
  removeStorageValue(STORAGE_KEYS.INTERVIEW_HOST_ROOM);
}

export function isPersistedInterviewHostRoom(room: string | null | undefined): boolean {
  const normalized = normalizeRoom(room);
  if (!normalized) return false;
  const saved = readPersistedHostRoom();
  return saved === normalized;
}

export function clearInterviewHostRoom(): void {
  removeStorageValue(STORAGE_KEYS.INTERVIEW_HOST_ROOM);
  removeStorageValue(LEGACY_INTERVIEW_HOST_KEY);
}
