/**
 * Shared Vitest setup — extend here for global DOM shims or matchers.
 * Tests that need a browser environment set @vitest-environment happy-dom per file.
 */

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

function hasStorageApi(storage: Storage | null | undefined): storage is Storage {
  return (
    !!storage &&
    typeof storage.clear === 'function' &&
    typeof storage.getItem === 'function' &&
    typeof storage.setItem === 'function' &&
    typeof storage.removeItem === 'function'
  );
}

const windowStorage = typeof window === 'undefined' ? null : window.localStorage;
const storage = hasStorageApi(windowStorage) ? windowStorage : createMemoryStorage();

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: storage,
});
