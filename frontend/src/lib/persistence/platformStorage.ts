/** Platform localStorage keys — must stay in sync with store/storageKeys.ts. */
const NS = 'algo-moves';
const k = (...parts: string[]) => [NS, ...parts].join(':');

export const PLATFORM_STORAGE_KEYS = {
  GUEST_ID: k('games', 'guest-id'),
  PERSONAL_ROOM: k('games', 'personal-room'),
} as const;

export type PlatformStorageKey = (typeof PLATFORM_STORAGE_KEYS)[keyof typeof PLATFORM_STORAGE_KEYS];

function localStore(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function readText(key: PlatformStorageKey): string | null {
  try {
    return localStore()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeText(key: PlatformStorageKey, value: string): void {
  try {
    localStore()?.setItem(key, value);
  } catch {
    // ignore
  }
}
