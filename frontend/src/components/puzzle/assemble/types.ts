import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { CodePiece } from '@/lib/code';

export interface AssembleGameStats {
  mistakes: number;
  /** Wall-clock time from first interaction to win. */
  ms: number;
  perfect: boolean;
}

export function createAssembleGameStats(
  startMs: number,
  endMs = Date.now(),
  mistakes = 0,
): AssembleGameStats {
  return {
    mistakes,
    ms: Math.max(0, endMs - startMs),
    perfect: mistakes === 0,
  };
}

export function assembleGameSeconds(stats: AssembleGameStats): number {
  return stats.ms / 1000;
}

export function parseAssembleBestSeconds(value: string | null): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function resolveAssembleBestSeconds(
  primary: string | null,
  legacy: string | null = null,
): number | null {
  return parseAssembleBestSeconds(primary) ?? parseAssembleBestSeconds(legacy);
}

export function isBetterAssembleTime(seconds: number, best: number | null): boolean {
  return Number.isFinite(seconds) && seconds > 0 && (best === null || seconds < best);
}

/**
 * Contract every assemble game renders against. Games are self-contained:
 * they own their state, feedback and win detection, and report the finished
 * run through onComplete. Hosts (mobile deck card, Learn Studio tab) supply
 * the pieces and a storage namespace for bests/streaks.
 */
/**
 * Persistence port for bests/streaks/unlocks — one JSON blob per game.
 * Shell hosts supply an adapter over the app storage layer; games stay
 * store-free (components must not import store/, per docs/architecture.md).
 */
export interface AssembleGameStatsStore {
  read<T extends object>(gameId: string, fallback: T): T;
  write(gameId: string, value: object): void;
}

export interface AssembleGameProps {
  pieces: CodePiece[];
  lang?: string;
  /** Deterministic seed scope (tile geography, deals) — stable per problem + language variant. */
  storageKey: string;
  /** Persisted bests adapter; omitted → session-only in-memory stats. */
  stats?: AssembleGameStatsStore;
  /** Fires once per win, at the moment the run completes. */
  onComplete?: (stats: AssembleGameStats) => void;
  /** When set, the win card offers a "Continue" secondary action (deck advance). */
  onContinue?: () => void;
}

export interface AssembleGameDef {
  id: string;
  name: string;
  /** Under 8 words — shown under the mode name in pickers. */
  tagline: string;
  icon: LucideIcon;
  Component: ComponentType<AssembleGameProps>;
}
