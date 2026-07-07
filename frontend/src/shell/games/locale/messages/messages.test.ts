import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_LOCALE } from '../types';
import { getArcadeStrings } from './index';

describe('arcade messages', () => {
  it('defaults to English locale', () => {
    expect(DEFAULT_GAME_LOCALE).toBe('en');
  });

  it('returns Arabic strings for ar locale', () => {
    const t = getArcadeStrings('ar');
    expect(t.header.games).toBe('الألعاب');
    expect(t.lobby.title).toBeTruthy();
    expect(t.picker.title).toBeTruthy();
    expect(t.shareRoom.roomCode).toBeTruthy();
  });

  it('returns English strings for en locale', () => {
    const t = getArcadeStrings('en');
    expect(t.header.games).toBe('Games');
    expect(t.lobby.title).toBe('Play with friends');
    expect(t.picker.title).toBe('Pick a game');
    expect(t.picker.filterAll).toBe('All');
    expect(t.picker.howToPlay).toBe('How to play:');
    expect(t.shareRoom.roomCode).toBe('Room code');
    expect(t.room.readyUp).toBe('Ready up');
    expect(t.leaderboard.title).toBe('Leaderboards');
  });

  it('formats waiting reconnect with partner name', () => {
    const t = getArcadeStrings('en');
    expect(t.waitingReconnect('Alex')).toContain('Alex');
    expect(t.waitingReconnect('Alex')).toContain('reconnect');
  });
});

describe('game common strings', () => {
  it('exports shared keys for en and ar', async () => {
    const { getGameCommonStrings } = await import('../gameCommon');
    expect(getGameCommonStrings('en').playAgain).toBe('Play again');
    expect(getGameCommonStrings('ar').you).toBe('أنت');
  });
});
