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

export interface JoinOpts {
  pid?: string;
  asSpectator?: boolean;
  capacity?: number;
}

export function gameServerWsUrl(room: string, name: string, opts: JoinOpts = {}): string {
  const ws = gameServerHttpBase().replace(/^http/, 'ws');
  const params = new URLSearchParams({ room: room.toUpperCase(), name });
  if (opts.pid) params.set('pid', opts.pid);
  if (opts.asSpectator) params.set('role', 'spectator');
  if (opts.capacity && opts.capacity > 0) params.set('cap', String(opts.capacity));
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

export function makeRoomCode(len = 4): string {
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  return out;
}

export function normalizeRoomCode(input: string, len = 4): string {
  return input
    .toUpperCase()
    .split('')
    .filter((ch) => CODE_ALPHABET.includes(ch))
    .join('')
    .slice(0, len);
}
