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

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isRole(value: unknown): value is Role {
  return value === 'host' || value === 'guest' || value === 'player' || value === 'spectator';
}

function isPeer(value: unknown): value is Peer {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isRole(value.role)
  );
}

function isPeerArray(value: unknown): value is Peer[] {
  return Array.isArray(value) && value.every(isPeer);
}

function isServerMessage(value: unknown): value is ServerMessage {
  if (!isObject(value)) return false;
  switch (value.t) {
    case 'welcome':
      return (
        isPeer(value.self) &&
        isPeerArray(value.players) &&
        isPeerArray(value.spectators) &&
        typeof value.capacity === 'number' &&
        Number.isFinite(value.capacity)
      );
    case 'peer-join':
    case 'peer-leave':
    case 'role-change':
      return isPeer(value.peer);
    case 'relay':
      return typeof value.from === 'string';
    case 'state':
      return true;
    case 'error':
      return typeof value.msg === 'string';
    default:
      return false;
  }
}

export function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const msg = JSON.parse(raw);
    if (isServerMessage(msg)) return msg;
  } catch {
    /* ignore malformed frames */
  }
  return null;
}
