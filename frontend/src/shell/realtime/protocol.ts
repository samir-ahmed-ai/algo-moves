/**
 * Wire protocol shared with the Go backend (see backend/internal/hub/message.go).
 * The server is game-agnostic: it relays each game's own JSON payloads inside the
 * `relay` envelope and remembers the host's `state` for late joiners. A room holds
 * up to `capacity` ordered players (seat 0 is the host) plus any number of
 * watch-only spectators; joins past capacity land in the spectator gallery.
 */

/** A client's standing in a room. `guest` is seat 1 (kept for 2-player games). */
export type Role = 'host' | 'guest' | 'player' | 'spectator';

export interface Peer {
  id: string;
  name: string;
  role: Role;
}

/** Messages the server sends to a client. */
export type ServerMessage =
  | {
      t: 'welcome';
      self: Peer;
      players: Peer[];
      spectators: Peer[];
      capacity: number;
      state: unknown;
    }
  | { t: 'peer-join'; peer: Peer }
  | { t: 'peer-leave'; peer: Peer }
  /** A peer's role changed — host handoff, or a spectator/player seat swap. */
  | { t: 'role-change'; peer: Peer }
  | { t: 'relay'; from: string; d: unknown }
  | { t: 'state'; d: unknown }
  | { t: 'error'; msg: string };

/** Messages a client sends to the server. */
export type ClientMessage =
  | { t: 'relay'; d: unknown }
  | { t: 'state'; d: unknown }
  | { t: 'seat'; d: { want: 'player' | 'spectator' } };

/** Whether a role occupies an active player seat (not a spectator). */
export function isPlayerRole(role: Role | null | undefined): boolean {
  return role === 'host' || role === 'guest' || role === 'player';
}

export function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const msg = JSON.parse(raw) as ServerMessage;
    if (msg && typeof msg === 'object' && typeof (msg as { t?: unknown }).t === 'string') {
      return msg;
    }
  } catch {
    /* ignore malformed frames */
  }
  return null;
}
