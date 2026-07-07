/**
 * Pure binary-search engine for the Bisect dojo game.
 * A sorted deck of face-down cards: probe the middle of the active range,
 * compare against the target, and discard the half that can't hold it.
 * All validity rules, the lower-bound variant and the canonical optimal
 * run live here so the React layer stays a thin shell.
 */

export type BisectMode = 'find' | 'lowerBound';

export interface BisectLevel {
  id: string;
  title: string;
  objective: string;
  lesson: string;
  /** Sorted ascending (duplicates allowed). */
  values: number[];
  target: number;
  mode: BisectMode;
  par: number;
}

export interface BisectState {
  /** Active range is values[lo..hi] inclusive; empty when lo > hi. */
  lo: number;
  hi: number;
  /** Index probed for the CURRENT range — null until the next probe. */
  probedMid: number | null;
  /** Every index ever flipped face-up (kept for display). */
  revealed: number[];
  /** Leftmost equal element seen so far (lower-bound mode). */
  candidate: number | null;
}

export const LEVELS: BisectLevel[] = [
  {
    id: 'bs-01',
    title: 'Split the deck',
    objective: 'Find the 14 among 7 face-down cards.',
    lesson:
      'The deck is sorted, so one flip tells you everything about half of it. Flip the middle card: if it is bigger than the target, the target cannot sit to its right — throw that whole half away. Each probe kills half the deck, so 7 cards fall in at most 3 probes. That halving is the entire algorithm.',
    values: [3, 8, 14, 23, 31, 42, 57],
    target: 14,
    mode: 'find',
    par: 5,
  },
  {
    id: 'bs-02',
    title: 'Bigger haystack',
    objective: 'Find the 34 among 15 cards.',
    lesson:
      'Doubling the deck costs you exactly ONE extra probe. 7 cards need 3, 15 need 4, a million need 20 — the probe count grows as log₂(n), not n. Feel it here: the same rhythm as before, just one more halving.',
    values: [2, 5, 9, 13, 17, 21, 26, 30, 34, 39, 44, 50, 55, 61, 68],
    target: 34,
    mode: 'find',
    par: 7,
  },
  {
    id: 'bs-03',
    title: 'The missing card',
    objective: 'Prove that 36 is not in the deck.',
    lesson:
      'What if the target simply is not there? Keep halving anyway. Every discard is justified, so when the active range shrinks to NOTHING, you hold a proof: no card was skipped unfairly, so the target cannot exist. An empty range is exactly how code knows to return -1. Declare it with x — but only once the range is truly empty.',
    values: [2, 5, 9, 13, 17, 21, 26, 30, 34, 39, 44, 50, 55, 61, 68],
    target: 36,
    mode: 'find',
    par: 9,
  },
  {
    id: 'bs-04',
    title: 'First of many',
    objective: 'Find the FIRST 12 — duplicates lurk.',
    lesson:
      'When the target repeats, hitting one copy is not enough — you want the FIRST. An equal flip is only a CANDIDATE: remember it, then keep searching the left half (press h) in case an earlier copy hides there. When the range empties, the leftmost candidate you saw is provably the first. This is lower_bound — the workhorse behind "insert position" and range counting.',
    values: [4, 7, 9, 12, 12, 12, 12, 12, 15, 18, 21, 24, 27],
    target: 12,
    mode: 'lowerBound',
    par: 9,
  },
  {
    id: 'bs-05',
    title: 'The vault',
    objective: 'Crack the vault: find the 68 among 31 cards.',
    lesson:
      'The boss vault: 31 cards, and 5 probes are all you get. Trust the invariant — the target, if it exists, is always inside the active range, and every comparison tells you exactly which half to burn. No guessing, no second looks. This is the whole of binary search.',
    values: [
      2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 56, 59, 62, 65, 68, 71,
      74, 77, 80, 83, 86, 89, 92,
    ],
    target: 68,
    mode: 'find',
    par: 9,
  },
];

export const LEVEL_IDS = LEVELS.map((level) => level.id);

export function getLevel(id: string): BisectLevel | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((level) => level.id === currentId);
  if (idx === -1 || idx === LEVELS.length - 1) return null;
  return LEVELS[idx + 1]!.id;
}

export function mid(lo: number, hi: number): number {
  return Math.floor((lo + hi) / 2);
}

export function createState(level: BisectLevel): BisectState {
  return { lo: 0, hi: level.values.length - 1, probedMid: null, revealed: [], candidate: null };
}

/** True once every index has been discarded — the active range is empty. */
export function rangeEmpty(state: BisectState): boolean {
  return state.lo > state.hi;
}

/** Index of the target's first occurrence, or -1 (ground truth for tests/UI). */
export function targetIndex(level: BisectLevel): number {
  return level.values.indexOf(level.target);
}

export type ProbeResult =
  | {
      ok: true;
      state: BisectState;
      outcome: 'found' | 'candidate' | 'revealed';
      index: number;
      value: number;
    }
  /** empty — nothing left to flip; alreadyProbed — this range's mid is face-up. */
  | { ok: false; reason: 'empty' | 'alreadyProbed' };

/** m — flip the middle card of the active range. Equal hits finish (find) or mark a candidate (lowerBound). */
export function probe(level: BisectLevel, state: BisectState): ProbeResult {
  if (rangeEmpty(state)) return { ok: false, reason: 'empty' };
  if (state.probedMid !== null) return { ok: false, reason: 'alreadyProbed' };
  const index = mid(state.lo, state.hi);
  const value = level.values[index]!;
  const revealed = state.revealed.includes(index) ? state.revealed : [...state.revealed, index];
  if (value === level.target) {
    if (level.mode === 'lowerBound') {
      const candidate = state.candidate === null ? index : Math.min(state.candidate, index);
      return {
        ok: true,
        outcome: 'candidate',
        index,
        value,
        state: { ...state, probedMid: index, revealed, candidate },
      };
    }
    return {
      ok: true,
      outcome: 'found',
      index,
      value,
      state: { ...state, probedMid: index, revealed },
    };
  }
  return {
    ok: true,
    outcome: 'revealed',
    index,
    value,
    state: { ...state, probedMid: index, revealed },
  };
}

export type DiscardKey = 'l' | 'h';

export type DiscardResult =
  | { ok: true; state: BisectState; outcome: 'narrowed' | 'lowerBoundComplete' }
  /**
   * empty — nothing left to discard; notProbed — flip before discarding;
   * wrongDirection — the comparison demands the other half; keepLeft — an
   * equal probe (lower-bound) forbids discarding the left half.
   */
  | { ok: false; reason: 'empty' | 'notProbed' | 'wrongDirection' | 'keepLeft' };

/** l discards the left half (lo = mid+1); h discards the right half (hi = mid-1). */
export function discard(level: BisectLevel, state: BisectState, key: DiscardKey): DiscardResult {
  if (rangeEmpty(state)) return { ok: false, reason: 'empty' };
  if (state.probedMid === null) return { ok: false, reason: 'notProbed' };
  const i = state.probedMid;
  const value = level.values[i]!;
  if (value === level.target) {
    // Only reachable in lower-bound mode: an == probe must keep the left half.
    if (key === 'l') return { ok: false, reason: 'keepLeft' };
  } else if (key === 'l' ? value > level.target : value < level.target) {
    return { ok: false, reason: 'wrongDirection' };
  }
  const next: BisectState =
    key === 'l'
      ? { ...state, lo: i + 1, probedMid: null }
      : { ...state, hi: i - 1, probedMid: null };
  if (level.mode === 'lowerBound' && rangeEmpty(next) && next.candidate !== null) {
    return { ok: true, state: next, outcome: 'lowerBoundComplete' };
  }
  return { ok: true, state: next, outcome: 'narrowed' };
}

export const discardLeft = (level: BisectLevel, state: BisectState): DiscardResult =>
  discard(level, state, 'l');

export const discardRight = (level: BisectLevel, state: BisectState): DiscardResult =>
  discard(level, state, 'h');

export type AbsentResult =
  | { ok: true }
  /** notEmpty — cards remain unruled; lowerBound — the target is provably present. */
  | { ok: false; reason: 'notEmpty' | 'lowerBound' };

/** x — declaring "not here" is only correct once the active range is empty (find mode). */
export function declareAbsent(level: BisectLevel, state: BisectState): AbsentResult {
  if (level.mode === 'lowerBound' && state.candidate !== null) {
    return { ok: false, reason: 'lowerBound' };
  }
  if (!rangeEmpty(state)) return { ok: false, reason: 'notEmpty' };
  if (level.mode === 'lowerBound') return { ok: false, reason: 'lowerBound' };
  return { ok: true };
}

export interface OptimalRun {
  actions: number;
  outcome: 'found' | 'absent' | 'lowerBound';
  index: number | null;
}

/**
 * The textbook run, validated through the same reducers the player faces:
 * probe the mid, discard the dictated half (keep-left on equality in
 * lower-bound mode), declare absence when the range empties.
 */
export function simulateOptimal(level: BisectLevel): OptimalRun {
  let state = createState(level);
  let actions = 0;
  for (let guard = 0; guard <= 4 * level.values.length + 8; guard++) {
    if (rangeEmpty(state)) {
      if (!declareAbsent(level, state).ok) break;
      return { actions: actions + 1, outcome: 'absent', index: null };
    }
    const probed = probe(level, state);
    if (!probed.ok) break;
    actions += 1;
    if (probed.outcome === 'found') return { actions, outcome: 'found', index: probed.index };
    state = probed.state;
    const key: DiscardKey = probed.value < level.target ? 'l' : 'h';
    const discarded = discard(level, state, key);
    if (!discarded.ok) break;
    actions += 1;
    state = discarded.state;
    if (discarded.outcome === 'lowerBoundComplete') {
      return { actions, outcome: 'lowerBound', index: state.candidate };
    }
  }
  throw new Error(`optimal run failed to terminate for ${level.id}`);
}
