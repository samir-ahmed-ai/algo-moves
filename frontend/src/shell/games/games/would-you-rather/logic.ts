import type { WyrCategory, WyrPrompt } from './prompts';
import { pickPrompts } from './prompts';

export const ROUNDS = 8;
export const ROUND_MS = 15000;
export const REVEAL_MS = 2500;

/** A single option: 'a' or 'b'. */
export type WyrChoice = 'a' | 'b';

export type WyrPhase = 'category-pick' | 'picking' | 'reveal' | 'over';

/**
 * Host-authoritative game state, published to the room on every change.
 * Guests + spectators adopt it from sharedState.
 */
export interface WyrState {
  phase: WyrPhase;
  round: number;
  /** Epoch ms when the picking window closes; null outside picking phase. */
  deadline: number | null;
  /** answers[round][peerId] = 'a' | 'b' */
  answers: Record<number, Record<string, WyrChoice>>;
  /** Cumulative score: peerId → points. */
  scores: Record<string, number>;
  /** Seeded prompt list baked in by the host at game start. */
  prompts: WyrPrompt[];
  /** Selected categories (empty = all). */
  categories: WyrCategory[];
}

export function freshState(): WyrState {
  return {
    phase: 'category-pick',
    round: 0,
    deadline: null,
    answers: {},
    scores: {},
    prompts: [],
    categories: [],
  };
}

export function startGame(categories: WyrCategory[], seed: number): Partial<WyrState> {
  return {
    phase: 'picking',
    round: 0,
    deadline: null,
    answers: {},
    scores: {},
    prompts: pickPrompts(categories, ROUNDS, seed),
    categories,
  };
}

/** Did both players pick the same option this round? */
export function isMatch(answers: Record<string, WyrChoice>, playerIds: string[]): boolean {
  if (playerIds.length < 2) return false;
  const picks = playerIds.map((id) => answers[id]);
  if (picks.some((p) => p === undefined)) return false;
  return picks[0] === picks[1];
}

/** Score delta for this round. Match = +2 each; no match = winner gets +1. */
export function computeRoundDeltas(
  answers: Record<string, WyrChoice>,
  playerIds: string[],
): Record<string, number> {
  const deltas: Record<string, number> = {};
  if (isMatch(answers, playerIds)) {
    for (const id of playerIds) deltas[id] = 2;
  } else {
    // No match — give +1 to whichever option was picked (bravery point for variety)
    for (const id of playerIds) {
      if (answers[id] !== undefined) deltas[id] = 1;
    }
  }
  return deltas;
}

export function applyDeltas(
  scores: Record<string, number>,
  deltas: Record<string, number>,
): Record<string, number> {
  const next = { ...scores };
  for (const [id, delta] of Object.entries(deltas)) {
    next[id] = (next[id] ?? 0) + delta;
  }
  return next;
}

export type CompatLabel = 'soulmates' | 'wellMatched' | 'beautyInDifference';

export function compatLabel(matchCount: number, total: number): CompatLabel {
  const ratio = total > 0 ? matchCount / total : 0;
  if (ratio >= 0.75) return 'soulmates';
  if (ratio >= 0.5) return 'wellMatched';
  return 'beautyInDifference';
}
