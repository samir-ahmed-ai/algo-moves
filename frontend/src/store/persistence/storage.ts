export type StorageKey = string;
export type StorageValidator<T> = (value: unknown) => value is T;

function normalizeStorageKey(key: StorageKey): string | null {
  const normalized = key.trim();
  return normalized || null;
}

function localStore(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readWithStorage<T>(
  key: StorageKey,
  fallback: T,
  read: (storage: Storage, storageKey: string) => T,
): T {
  const storageKey = normalizeStorageKey(key);
  if (!storageKey) return fallback;
  const storage = localStore();
  if (!storage) return fallback;
  try {
    return read(storage, storageKey);
  } catch {
    return fallback;
  }
}

function writeWithStorage(
  key: StorageKey,
  write: (storage: Storage, storageKey: string) => void,
): void {
  const storageKey = normalizeStorageKey(key);
  if (!storageKey) return;
  const storage = localStore();
  if (!storage) return;
  try {
    write(storage, storageKey);
  } catch {
    // ignore storage failures
  }
}

export function readStorageJson<T>(
  key: StorageKey,
  fallback: T,
  validate?: StorageValidator<T> | undefined,
): T {
  return readWithStorage(key, fallback, (storage, storageKey) => {
    const raw = storage.getItem(storageKey);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  });
}

export function writeStorageJson(key: StorageKey, value: unknown): void {
  writeWithStorage(key, (storage, storageKey) => {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      storage.removeItem(storageKey);
      return;
    }
    storage.setItem(storageKey, serialized);
  });
}

export function readStorageText(key: StorageKey, fallback: string | null = null): string | null {
  return readWithStorage(
    key,
    fallback,
    (storage, storageKey) => storage.getItem(storageKey) ?? fallback,
  );
}

export function writeStorageText(key: StorageKey, value: string): void {
  writeWithStorage(key, (storage, storageKey) => storage.setItem(storageKey, value));
}

export function removeStorageValue(key: StorageKey): void {
  writeWithStorage(key, (storage, storageKey) => storage.removeItem(storageKey));
}
