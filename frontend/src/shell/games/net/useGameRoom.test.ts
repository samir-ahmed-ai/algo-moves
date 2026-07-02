import { describe, expect, it } from 'vitest';
import { parseServerMessage } from './protocol';

describe('useGameRoom message routing', () => {
  it('parses room-full errors', () => {
    const msg = parseServerMessage(JSON.stringify({ t: 'error', msg: 'room-full' }));
    expect(msg).toEqual({ t: 'error', msg: 'room-full' });
  });

  it('parses welcome with peers and state', () => {
    const msg = parseServerMessage(
      JSON.stringify({
        t: 'welcome',
        self: { id: 'c1', name: 'Ahmed', role: 'host' },
        peers: [],
        state: { game: 'tic-tac-toe' },
      }),
    );
    expect(msg?.t).toBe('welcome');
    if (msg?.t === 'welcome') {
      expect(msg.self.role).toBe('host');
      expect(msg.state).toEqual({ game: 'tic-tac-toe' });
    }
  });

  it('ignores malformed frames', () => {
    expect(parseServerMessage('not json')).toBeNull();
  });
});
