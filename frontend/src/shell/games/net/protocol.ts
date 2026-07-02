/**
 * Wire protocol shared with the Go backend (see backend/internal/hub/message.go).
 * The server is game-agnostic: it relays each game's own JSON payloads inside the
 * `relay` envelope and remembers the host's `state` for late joiners.
 */

export type Role = 'host' | 'guest';

export interface Peer {
  id: string;
  name: string;
  role: Role;
}

/** Messages the server sends to a client. */
export type ServerMessage =
  | { t: 'welcome'; self: Peer; peers: Peer[]; state: unknown }
  | { t: 'peer-join'; peer: Peer }
  | { t: 'peer-leave'; peer: Peer }
  | { t: 'relay'; from: string; d: unknown }
  | { t: 'state'; d: unknown }
  | { t: 'error'; msg: string };

/** Messages a client sends to the server. */
export type ClientMessage =
  | { t: 'relay'; d: unknown }
  | { t: 'state'; d: unknown };

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
