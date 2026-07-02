import { describe, expect, it } from 'vitest';
import { isPlayerRole, parseServerMessage } from './protocol';

describe('protocol message parsing', () => {
  it('parses room-full errors', () => {
    const msg = parseServerMessage(JSON.stringify({ t: 'error', msg: 'room-full' }));
    expect(msg).toEqual({ t: 'error', msg: 'room-full' });
  });

  it('parses welcome with players, spectators, capacity and state', () => {
    const msg = parseServerMessage(
      JSON.stringify({
        t: 'welcome',
        self: { id: 'c1', name: 'Ahmed', role: 'host' },
        players: [{ id: 'c1', name: 'Ahmed', role: 'host' }],
        spectators: [],
        capacity: 4,
        state: { game: 'tic-tac-toe' },
      }),
    );
    expect(msg?.t).toBe('welcome');
    if (msg?.t === 'welcome') {
      expect(msg.self.role).toBe('host');
      expect(msg.players).toHaveLength(1);
      expect(msg.capacity).toBe(4);
      expect(msg.state).toEqual({ game: 'tic-tac-toe' });
    }
  });

  it('parses a role-change frame', () => {
    const msg = parseServerMessage(
      JSON.stringify({ t: 'role-change', peer: { id: 'c2', name: 'Nour', role: 'guest' } }),
    );
    expect(msg?.t).toBe('role-change');
    if (msg?.t === 'role-change') expect(msg.peer.role).toBe('guest');
  });

  it('ignores malformed frames', () => {
    expect(parseServerMessage('not json')).toBeNull();
  });
});

describe('isPlayerRole', () => {
  it('treats seated roles as players and spectators as not', () => {
    expect(isPlayerRole('host')).toBe(true);
    expect(isPlayerRole('guest')).toBe(true);
    expect(isPlayerRole('player')).toBe(true);
    expect(isPlayerRole('spectator')).toBe(false);
    expect(isPlayerRole(null)).toBe(false);
  });
});
