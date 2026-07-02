/** Sentinel time recorded for a false start (tapping before green). Losing-large. */
export const FALSE_START = 100000;

/** First to this many round wins takes the match (best of 5). */
export const WIN_TARGET = 3;

export type RoundWinner = 'me' | 'peer' | 'draw';

/**
 * Who won a round given both reaction times in ms (lower is better).
 * A false start counts as its sentinel time, so it always loses to a real tap.
 * Two false starts (or an exact tie) is a draw.
 *
 * Retained for the two-player fast path so 2p behavior stays byte-identical.
 */
export function roundWinner(myMs: number, peerMs: number): RoundWinner {
  if (myMs === peerMs) return 'draw';
  return myMs < peerMs ? 'me' : 'peer';
}

/** True once any player has reached the win target. */
export function matchOver(...scores: number[]): boolean {
  return scores.some((s) => s >= WIN_TARGET);
}

/** True when a tap time is a false start rather than a real reaction. */
export function isFalseStart(ms: number): boolean {
  return ms >= FALSE_START;
}

export interface RoundResolution {
  /**
   * The sole fastest valid (non-false-start) tapper's id, or null when nobody
   * tapped a valid time or the fastest valid time is tied between players.
   * A null winner means the round is a wash and no score is awarded.
   */
  winnerId: string | null;
  /** All tap times sorted fastest-first; false starts sort last. */
  ranking: { id: string; ms: number }[];
}

/**
 * Resolve one reaction-ladder round from every player's tap time.
 *
 * The fastest strictly-unique valid tap wins. False starts (>= FALSE_START)
 * never win. A tie for fastest valid time, or an all-false-start round, yields
 * no winner (winnerId === null) so the round is simply replayed.
 *
 * This is the single source of truth for both 2-player and N-player rounds:
 * with exactly two entries it agrees with `roundWinner`, except a two-way tie
 * resolves to null (a draw) here rather than 'draw' string.
 */
export function resolveRound(taps: Record<string, number>): RoundResolution {
  const ranking = Object.entries(taps)
    .map(([id, ms]) => ({ id, ms }))
    .sort((a, b) => a.ms - b.ms);

  const valid = ranking.filter((r) => !isFalseStart(r.ms));
  if (valid.length === 0) return { winnerId: null, ranking };

  const best = valid[0].ms;
  // A unique fastest valid time wins; a tie for fastest is a wash.
  const tiedForBest = valid.filter((r) => r.ms === best);
  return { winnerId: tiedForBest.length === 1 ? valid[0].id : null, ranking };
}

/**
 * Placement (1 = best) for every player id given their accumulated round-win
 * scores. Players with equal scores share a placement; the next placement skips
 * accordingly (standard competition ranking, e.g. 1,1,3).
 */
export function placementsByScore(scores: Record<string, number>): Record<string, number> {
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const out: Record<string, number> = {};
  let placement = 0;
  let seen = 0;
  let prevScore: number | null = null;
  for (const [id, score] of entries) {
    seen += 1;
    if (score !== prevScore) {
      placement = seen;
      prevScore = score;
    }
    out[id] = placement;
  }
  return out;
}
