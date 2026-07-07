/** Platform localStorage keys — must stay in sync with store/storageKeys.ts. */
const NS = 'algo-moves';
const k = (...parts: string[]) => [NS, ...parts].join(':');

export const PLATFORM_STORAGE_KEYS = {
  GUEST_ID: k('games', 'guest-id'),
  PERSONAL_ROOM: k('games', 'personal-room'),
} as const;

export function readText(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeText(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}
