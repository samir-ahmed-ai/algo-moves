import type { ProblemStat, ProgressData, Mistake } from '@/store/persistence/progress';
import type { SrsCard, SrsData } from '@/store/persistence/srs';

/**
 * Pure merge functions shared by the client sync engine and mirrored by the
 * server's ON CONFLICT clauses (backend/db/queries/learning.sql). Keeping them pure
 * makes them unit-testable and guarantees client and server converge to the same
 * value regardless of push order.
 */

const MAX_MISTAKES = 50;

/** Field-wise monotonic merge — counters never regress; streak follows the later attempt. */
export function mergeStat(a: ProblemStat, b: ProblemStat): ProblemStat {
  const attempts = Math.max(a.attempts, b.attempts);
  const aTs = a.lastAttemptAt ?? 0;
  const bTs = b.lastAttemptAt ?? 0;
  const lastTs = Math.max(aTs, bTs);
  const laterIsB = bTs >= aTs; // ties → remote, mirroring the server's `excluded >= existing`
  return {
    attempts,
    correct: Math.min(Math.max(a.correct, b.correct), attempts),
    streak: laterIsB ? b.streak : a.streak,
    bestStreak: Math.max(a.bestStreak, b.bestStreak),
    mastered: a.mastered || b.mastered,
    ...(lastTs > 0 ? { lastAttemptAt: lastTs } : {}),
  };
}

export function mergeProgress(local: ProgressData, remote: ProgressData): ProgressData {
  const stats: Record<string, ProblemStat> = { ...local.stats };
  for (const [id, rstat] of Object.entries(remote.stats)) {
    const lstat = stats[id];
    stats[id] = lstat ? mergeStat(lstat, rstat) : rstat;
  }
  return { stats, mistakes: mergeMistakes(local.mistakes, remote.mistakes) };
}

/** Union by id, most-recent-first (local wins order), capped. */
function mergeMistakes(local: Mistake[], remote: Mistake[]): Mistake[] {
  const seen = new Set<string>();
  const out: Mistake[] = [];
  for (const m of [...local, ...remote]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
    if (out.length >= MAX_MISTAKES) break;
  }
  return out;
}

/** Higher reps wins; tie → later due; final tie → `a`. Mirrors the server review merge. */
export function mergeSrsCard(a: SrsCard, b: SrsCard): SrsCard {
  if (b.reps > a.reps) return b;
  if (b.reps < a.reps) return a;
  return b.due > a.due ? b : a;
}

export function mergeSrs(local: SrsData, remote: SrsData): SrsData {
  const cards: Record<string, SrsCard> = { ...local.cards };
  for (const [id, rcard] of Object.entries(remote.cards)) {
    const lcard = cards[id];
    cards[id] = lcard ? mergeSrsCard(lcard, rcard) : rcard;
  }
  return { cards };
}
