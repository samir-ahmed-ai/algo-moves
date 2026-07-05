/**
 * Remembers which interview room this browser is hosting, so a host who reloads
 * the page rejoins as the host instead of being treated as a fresh guest by the
 * name-gate. Keyed by room code; cleared on leave.
 */
const KEY = 'algo-moves-interview-host';

export function markInterviewHost(room: string): void {
  try {
    localStorage.setItem(KEY, room.trim().toUpperCase());
  } catch {
    /* storage unavailable */
  }
}

export function isInterviewHostRoom(room: string | null | undefined): boolean {
  if (!room) return false;
  try {
    return localStorage.getItem(KEY) === room.trim().toUpperCase();
  } catch {
    return false;
  }
}

export function clearInterviewHost(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
