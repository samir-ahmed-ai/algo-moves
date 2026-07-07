import type { AssembleGameStatsStore } from './types';

/** Convenience over a game's stats blob for ms-based bests.
 *  Extra fields games merge into the same blob are preserved. */

interface BestBlob {
  bestMs?: number | null;
  [k: string]: unknown;
}

function parseMs(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function readBestMs(stats: AssembleGameStatsStore, gameId: string): number | null {
  return parseMs(stats.read<BestBlob>(gameId, {}).bestMs);
}

export function commitBestMs(
  stats: AssembleGameStatsStore,
  gameId: string,
  ms: number,
): { bestMs: number | null; newBest: boolean } {
  const blob = stats.read<BestBlob>(gameId, {});
  const current = parseMs(blob.bestMs);
  if (!Number.isFinite(ms) || ms <= 0) return { bestMs: current, newBest: false };
  if (current !== null && ms >= current) return { bestMs: current, newBest: false };
  stats.write(gameId, { ...blob, bestMs: ms });
  return { bestMs: ms, newBest: true };
}

/** Merge extra run stats (best streak, badges…) into the game's blob. */
export function mergeGameStats(
  stats: AssembleGameStatsStore,
  gameId: string,
  extras: Record<string, unknown>,
): void {
  stats.write(gameId, { ...stats.read<BestBlob>(gameId, {}), ...extras });
}
