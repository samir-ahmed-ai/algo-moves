export type Choice = 'rock' | 'paper' | 'scissors';

export const CHOICES: { id: Choice; label: string; emoji: string }[] = [
  { id: 'rock', label: 'Rock', emoji: '✊' },
  { id: 'paper', label: 'Paper', emoji: '✋' },
  { id: 'scissors', label: 'Scissors', emoji: '✌️' },
];

/** What each choice beats. */
const BEATS: Record<Choice, Choice> = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

export type RoundOutcome = 'win' | 'lose' | 'draw';

/** Outcome of `mine` versus `theirs`, from my perspective. */
export function outcome(mine: Choice, theirs: Choice): RoundOutcome {
  if (mine === theirs) return 'draw';
  return BEATS[mine] === theirs ? 'win' : 'lose';
}

/* ------------------------------------------------------------------ *
 * Two-player match (the original, unchanged best-of-five behaviour).  *
 * ------------------------------------------------------------------ */

/** First to this many round wins takes the two-player match. */
export const WIN_TARGET = 3;

export function matchOver(myScore: number, peerScore: number): boolean {
  return myScore >= WIN_TARGET || peerScore >= WIN_TARGET;
}

/* ------------------------------------------------------------------ *
 * N-player match (round-robin field scoring for 3+ seats).           *
 * Each round everyone throws; you earn one point for every opponent   *
 * you beat this round (pairwise). Ties award nobody. After a fixed    *
 * number of rounds the highest total wins; ties share the podium.     *
 * ------------------------------------------------------------------ */

/** How many rounds an N-player match runs before final ranking. */
export const NP_ROUNDS = 5;

/**
 * Pairwise points for a single round keyed by player id. Every player who
 * submitted a throw gets a score entry (0 if they beat nobody), so the field
 * ordering stays stable even when some players lose outright.
 */
export function scoreRound(picks: Record<string, Choice>): Record<string, number> {
  const ids = Object.keys(picks);
  const points: Record<string, number> = {};
  for (const id of ids) {
    let won = 0;
    for (const other of ids) {
      if (other === id) continue;
      if (outcome(picks[id], picks[other]) === 'win') won += 1;
    }
    points[id] = won;
  }
  return points;
}

/** Fold a round's pairwise points into the running totals (immutably). */
export function addRoundScores(
  totals: Record<string, number>,
  round: Record<string, number>,
): Record<string, number> {
  const next: Record<string, number> = { ...totals };
  for (const [id, pts] of Object.entries(round)) {
    next[id] = (next[id] ?? 0) + pts;
  }
  return next;
}

/** True once an N-player match has run its full set of rounds. */
export function npMatchOver(roundsPlayed: number): boolean {
  return roundsPlayed >= NP_ROUNDS;
}

export interface Placement {
  id: string;
  score: number;
  /** 1 = winner; players with equal scores share a placement. */
  placement: number;
}

/**
 * Rank players by score (highest first) into competition-style placements:
 * equal scores share a placement, and the next distinct score skips ranks
 * (1,1,3…). Every id in `scores` gets an entry.
 */
export function matchPlacements(scores: Record<string, number>): Placement[] {
  const rows = Object.entries(scores)
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);

  const out: Placement[] = [];
  let placement = 0;
  let seen = 0;
  let prevScore: number | null = null;
  for (const row of rows) {
    seen += 1;
    if (prevScore === null || row.score !== prevScore) {
      placement = seen; // standard competition ranking (skips after ties)
      prevScore = row.score;
    }
    out.push({ id: row.id, score: row.score, placement });
  }
  return out;
}
