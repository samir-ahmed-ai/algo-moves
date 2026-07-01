import { describe, expect, it } from 'vitest';
import { FALSE_START, matchOver, roundWinner, WIN_TARGET } from './logic';

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
});
