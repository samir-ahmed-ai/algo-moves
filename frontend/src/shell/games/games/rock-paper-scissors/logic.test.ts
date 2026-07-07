import { describe, expect, it } from 'vitest';
import {
  addRoundScores,
  matchOver,
  matchPlacements,
  NP_ROUNDS,
  npMatchOver,
  outcome,
  scoreRound,
  WIN_TARGET,
} from './logic';

describe('rock-paper-scissors logic', () => {
  it('scores wins correctly', () => {
    expect(outcome('rock', 'scissors')).toBe('win');
    expect(outcome('paper', 'rock')).toBe('win');
    expect(outcome('scissors', 'paper')).toBe('win');
  });

  it('scores losses correctly', () => {
    expect(outcome('scissors', 'rock')).toBe('lose');
    expect(outcome('rock', 'paper')).toBe('lose');
    expect(outcome('paper', 'scissors')).toBe('lose');
  });

  it('detects draws', () => {
    expect(outcome('rock', 'rock')).toBe('draw');
    expect(outcome('paper', 'paper')).toBe('draw');
  });

  it('ends the two-player match at the win target', () => {
    expect(matchOver(WIN_TARGET, 0)).toBe(true);
    expect(matchOver(0, WIN_TARGET)).toBe(true);
    expect(matchOver(WIN_TARGET - 1, WIN_TARGET - 1)).toBe(false);
  });
});

describe('rock-paper-scissors N-player scoring', () => {
  it('awards a two-player round exactly one point to the winner', () => {
    const pts = scoreRound({ a: 'rock', b: 'scissors' });
    expect(pts).toEqual({ a: 1, b: 0 });
  });

  it('gives nobody points on a two-player tie', () => {
    expect(scoreRound({ a: 'rock', b: 'rock' })).toEqual({ a: 0, b: 0 });
  });

  it('awards pairwise points across a three-player field', () => {
    // rock beats scissors, loses to paper; paper beats rock, loses to scissors.
    const pts = scoreRound({ a: 'rock', b: 'scissors', c: 'paper' });
    expect(pts).toEqual({ a: 1, b: 1, c: 1 }); // perfect rock-paper-scissors cycle
  });

  it('rewards beating the whole field', () => {
    const pts = scoreRound({ a: 'rock', b: 'scissors', c: 'scissors' });
    expect(pts).toEqual({ a: 2, b: 0, c: 0 });
  });

  it('accumulates round scores immutably', () => {
    const totals = { a: 1, b: 0 };
    const next = addRoundScores(totals, { a: 2, c: 1 });
    expect(next).toEqual({ a: 3, b: 0, c: 1 });
    expect(totals).toEqual({ a: 1, b: 0 }); // original untouched
  });

  it('ends an N-player match after the full round set', () => {
    expect(npMatchOver(NP_ROUNDS)).toBe(true);
    expect(npMatchOver(NP_ROUNDS - 1)).toBe(false);
  });

  it('ranks placements with ties sharing a rank and skipping after', () => {
    const places = matchPlacements({ a: 5, b: 5, c: 2, d: 0 });
    expect(places).toEqual([
      { id: 'a', score: 5, placement: 1 },
      { id: 'b', score: 5, placement: 1 },
      { id: 'c', score: 2, placement: 3 },
      { id: 'd', score: 0, placement: 4 },
    ]);
  });

  it('ranks a clear single winner first', () => {
    const places = matchPlacements({ x: 3, y: 1 });
    expect(places[0]).toEqual({ id: 'x', score: 3, placement: 1 });
    expect(places[1]!.placement).toBe(2);
  });
});
