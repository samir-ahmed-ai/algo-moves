/**
 * Resolves where the realtime game server lives and builds connection URLs.
 */
import {
  apiServerHttpBase,
  gameServerHttpBase,
  hasConfiguredApiServer,
} from '@/lib/network/apiServer';

export { apiServerHttpBase, gameServerHttpBase, hasConfiguredApiServer as hasConfiguredServer };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_ROOM_CODE_LENGTH = 4;

export interface JoinOpts {
  pid?: string | undefined;
  asSpectator?: boolean | undefined;
  capacity?: number | undefined;
}

export function gameServerWsUrl(room: string, name: string, opts: JoinOpts = {}): string {
  const ws = gameServerHttpBase().replace(/^http/, 'ws');
  const params = new URLSearchParams({
    room: normalizeRoomCode(room, Math.max(DEFAULT_ROOM_CODE_LENGTH, room.length)),
    name: name.trim() || 'Player',
  });
  if (opts.pid) params.set('pid', opts.pid);
  if (opts.asSpectator) params.set('role', 'spectator');
  if (opts.capacity && opts.capacity > 0) params.set('cap', String(Math.floor(opts.capacity)));
  return `${ws}/ws?${params.toString()}`;
}

export function makePlayerId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const buf = new Uint32Array(4);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => n.toString(16)).join('');
}

export async function fetchNewRoomCode(): Promise<string> {
  const res = await fetch(`${gameServerHttpBase()}/new`);
  if (!res.ok) throw new Error('Could not reach the game server.');
  const body = (await res.json()) as { code?: string };
  const code = body.code?.trim().toUpperCase();
  if (!code || code.length < 4) throw new Error('Invalid room code from server.');
  return normalizeRoomCode(code);
}

export function makeRoomCode(len = DEFAULT_ROOM_CODE_LENGTH): string {
  const safeLen = Number.isFinite(len) ? Math.max(1, Math.floor(len)) : DEFAULT_ROOM_CODE_LENGTH;
  const buf = new Uint32Array(safeLen);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < safeLen; i++) out += CODE_ALPHABET[buf[i]! % CODE_ALPHABET.length];
  return out;
}

export function normalizeRoomCode(input: string, len = DEFAULT_ROOM_CODE_LENGTH): string {
  const safeLen = Number.isFinite(len) ? Math.max(1, Math.floor(len)) : DEFAULT_ROOM_CODE_LENGTH;
  return input
    .toUpperCase()
    .split('')
    .filter((ch) => CODE_ALPHABET.includes(ch))
    .join('')
    .slice(0, safeLen);
}
