import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchNewRoomCode,
  gameServerHttpBase,
  gameServerWsUrl,
  hasConfiguredServer,
  makePlayerId,
  normalizeRoomCode,
} from './server';

describe('gameServer', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('uses VITE_GAMES_SERVER_URL when set', () => {
    vi.stubEnv('VITE_GAMES_SERVER_URL', 'https://games.example.com/');
    expect(gameServerHttpBase()).toBe('https://games.example.com');
    expect(hasConfiguredServer()).toBe(true);
    expect(gameServerWsUrl('abcd', 'Ahmed', { pid: 'pid-1' })).toBe(
      'wss://games.example.com/ws?room=ABCD&name=Ahmed&pid=pid-1',
    );
  });

  it('encodes spectator and capacity join options', () => {
    vi.stubEnv('VITE_GAMES_SERVER_URL', 'https://games.example.com');
    expect(gameServerWsUrl('abcd', 'Ahmed', { pid: 'p1', asSpectator: true, capacity: 4 })).toBe(
      'wss://games.example.com/ws?room=ABCD&name=Ahmed&pid=p1&role=spectator&cap=4',
    );
    // A default (no-opts) join carries neither role nor cap.
    expect(gameServerWsUrl('abcd', 'Ahmed')).toBe(
      'wss://games.example.com/ws?room=ABCD&name=Ahmed',
    );
  });

  it('normalizes room codes', () => {
    expect(normalizeRoomCode('ab1o')).toBe('AB');
  });

  it('mints stable player ids', () => {
    expect(makePlayerId()).toMatch(/^[a-f0-9-]{8,}$/i);
  });

  it('fetchNewRoomCode calls /new', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 'WXYZ' }),
      }),
    );
    await expect(fetchNewRoomCode()).resolves.toBe('WXYZ');
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/new$/));
  });

  it('fetchNewRoomCode surfaces server errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );
    await expect(fetchNewRoomCode()).rejects.toThrow(/Could not reach/);
  });
});
