export type StorageValidator<T> = (value: unknown) => value is T;

function hasStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readStorageJson<T>(key: string, fallback: T, validate?: StorageValidator<T>): T {
  const storage = hasStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeStorageJson(key: string, value: unknown): void {
  const storage = hasStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

export function readStorageText(key: string, fallback: string | null = null): string | null {
  const storage = hasStorage();
  if (!storage) return fallback;
  try {
    return storage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorageText(key: string, value: string): void {
  const storage = hasStorage();
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

export function removeStorageValue(key: string): void {
  const storage = hasStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore storage failures
  }
}
