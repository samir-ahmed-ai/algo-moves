import { describe, expect, it } from 'vitest';
import { GAMES } from './registry';
import { GAME_IDS } from './_generated/gameIds';

describe('games registry', () => {
  it('registers every catalog id from the db migration', () => {
    const registered = GAMES.map((g) => g.id).sort();
    expect(registered).toEqual([...GAME_IDS].sort());
  });

  it('has no duplicate game ids', () => {
    const ids = GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
