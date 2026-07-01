import { describe, expect, it } from 'vitest';
import { matchOver, outcome, WIN_TARGET } from './logic';

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

  it('ends the match at the win target', () => {
    expect(matchOver(WIN_TARGET, 0)).toBe(true);
    expect(matchOver(0, WIN_TARGET)).toBe(true);
    expect(matchOver(WIN_TARGET - 1, WIN_TARGET - 1)).toBe(false);
  });
});
