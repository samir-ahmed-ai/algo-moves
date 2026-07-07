export type StorageValidator<T> = (value: unknown) => value is T;

function normalizeStorageKey(key: string): string | null {
  const normalized = key.trim();
  return normalized || null;
}

function hasStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readStorageJson<T>(key: string, fallback: T, validate?: StorageValidator<T>): T {
  const storageKey = normalizeStorageKey(key);
  if (!storageKey) return fallback;
  const storage = hasStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(storageKey);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeStorageJson(key: string, value: unknown): void {
  const storageKey = normalizeStorageKey(key);
  if (!storageKey) return;
  const storage = hasStorage();
  if (!storage) return;
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      storage.removeItem(storageKey);
      return;
    }
    storage.setItem(storageKey, serialized);
  } catch {
    // ignore storage failures
  }
}

export function readStorageText(key: string, fallback: string | null = null): string | null {
  const storageKey = normalizeStorageKey(key);
  if (!storageKey) return fallback;
  const storage = hasStorage();
  if (!storage) return fallback;
  try {
    return storage.getItem(storageKey) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorageText(key: string, value: string): void {
  const storageKey = normalizeStorageKey(key);
  if (!storageKey) return;
  const storage = hasStorage();
  if (!storage) return;
  try {
    storage.setItem(storageKey, value);
  } catch {
    // ignore storage failures
  }
}

export function removeStorageValue(key: string): void {
  const storageKey = normalizeStorageKey(key);
  if (!storageKey) return;
  const storage = hasStorage();
  if (!storage) return;
  try {
    storage.removeItem(storageKey);
  } catch {
    // ignore storage failures
  }
}
