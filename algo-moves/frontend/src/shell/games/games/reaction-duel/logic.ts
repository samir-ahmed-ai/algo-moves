/** Sentinel time recorded for a false start (tapping before green). Losing-large. */
export const FALSE_START = 100000;

/** First to this many round wins takes the match (best of 5). */
export const WIN_TARGET = 3;

export type RoundWinner = 'me' | 'peer' | 'draw';

/**
 * Who won a round given both reaction times in ms (lower is better).
 * A false start counts as its sentinel time, so it always loses to a real tap.
 * Two false starts (or an exact tie) is a draw.
 */
export function roundWinner(myMs: number, peerMs: number): RoundWinner {
  if (myMs === peerMs) return 'draw';
  return myMs < peerMs ? 'me' : 'peer';
}

/** True once either side has reached the win target. */
export function matchOver(myScore: number, peerScore: number): boolean {
  return myScore >= WIN_TARGET || peerScore >= WIN_TARGET;
}
