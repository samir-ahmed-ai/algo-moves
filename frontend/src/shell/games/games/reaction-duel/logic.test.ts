import { describe, expect, it } from 'vitest';
import {
  FALSE_START,
  isFalseStart,
  matchOver,
  placementsByScore,
  resolveRound,
  roundWinner,
  WIN_TARGET,
} from './logic';

describe('reaction-duel logic', () => {
  it('the faster tap wins', () => {
    expect(roundWinner(180, 240)).toBe('me');
    expect(roundWinner(300, 210)).toBe('peer');
  });

  it('a false start loses to any real tap', () => {
    expect(roundWinner(FALSE_START, 240)).toBe('peer');
    expect(roundWinner(190, FALSE_START)).toBe('me');
  });

  it('both false starts is a draw', () => {
    expect(roundWinner(FALSE_START, FALSE_START)).toBe('draw');
  });

  it('an exact tie is a draw', () => {
    expect(roundWinner(212, 212)).toBe('draw');
  });

  it('ends the match at the win target', () => {
    expect(matchOver(WIN_TARGET, 0)).toBe(true);
    expect(matchOver(0, WIN_TARGET)).toBe(true);
    expect(matchOver(WIN_TARGET - 1, WIN_TARGET - 1)).toBe(false);
  });

  it('detects false starts', () => {
    expect(isFalseStart(FALSE_START)).toBe(true);
    expect(isFalseStart(FALSE_START + 500)).toBe(true);
    expect(isFalseStart(199)).toBe(false);
  });
});

describe('resolveRound (reaction ladder)', () => {
  it('picks the fastest valid tap in a two-player round', () => {
    const r = resolveRound({ a: 180, b: 240 });
    expect(r.winnerId).toBe('a');
    expect(r.ranking.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('picks the single fastest across many players', () => {
    const r = resolveRound({ a: 310, b: 205, c: 260, d: 190 });
    expect(r.winnerId).toBe('d');
    expect(r.ranking[0]).toEqual({ id: 'd', ms: 190 });
  });

  it('lets a false starter lose to any valid tapper', () => {
    const r = resolveRound({ a: FALSE_START, b: 400 });
    expect(r.winnerId).toBe('b');
  });

  it('never lets a false start win, even if numerically largest sentinel differs', () => {
    const r = resolveRound({ a: FALSE_START, b: FALSE_START, c: 220 });
    expect(r.winnerId).toBe('c');
  });

  it('is a wash (null winner) when everyone false-starts', () => {
    const r = resolveRound({ a: FALSE_START, b: FALSE_START, c: FALSE_START });
    expect(r.winnerId).toBeNull();
  });

  it('is a wash when the fastest valid time is tied', () => {
    expect(resolveRound({ a: 200, b: 200 }).winnerId).toBeNull();
    expect(resolveRound({ a: 200, b: 200, c: 350 }).winnerId).toBeNull();
  });

  it('sorts false starts to the end of the ranking', () => {
    const r = resolveRound({ a: 500, b: FALSE_START, c: 300 });
    expect(r.ranking.map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });

  it('handles an empty round', () => {
    expect(resolveRound({}).winnerId).toBeNull();
  });
});

describe('placementsByScore', () => {
  it('ranks a clear two-player winner first', () => {
    expect(placementsByScore({ a: 3, b: 1 })).toEqual({ a: 1, b: 2 });
  });

  it('shares placement 1 on a tie and skips the next', () => {
    expect(placementsByScore({ a: 2, b: 2, c: 0 })).toEqual({ a: 1, b: 1, c: 3 });
  });

  it('ranks N players by descending score', () => {
    expect(placementsByScore({ a: 3, b: 0, c: 2, d: 1 })).toEqual({ a: 1, c: 2, d: 3, b: 4 });
  });

  it('gives everyone placement 1 when all tied', () => {
    expect(placementsByScore({ a: 0, b: 0, c: 0 })).toEqual({ a: 1, b: 1, c: 1 });
  });
});
