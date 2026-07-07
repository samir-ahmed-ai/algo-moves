/**
 * Pure sliding-window engine for the Window Shopper dojo game.
 * Two disciplines share one loop over a window [l..r] that only ever moves
 * rightward:
 *   - 'min-sum'      (invalid → grow, valid → shrink): shortest window with
 *     sum ≥ target.
 *   - 'max-distinct' (valid → grow, invalid → shrink): longest window with at
 *     most `target` distinct values.
 * forcedMove() names the single legal move for a state; applying anything
 * else is a player mistake. The best window is recorded automatically, so a
 * run that follows the rule always ends on the optimum.
 */

export type WindowMode = 'min-sum' | 'max-distinct';
export type WindowMove = 'grow' | 'shrink';
export type ForcedMove = WindowMove | 'done';

export interface WindowLevel {
  id: string;
  title: string;
  objective: string;
  lesson: string;
  mode: WindowMode;
  /** Chip values: raw numbers for 'min-sum', fruit type indices for 'max-distinct'. */
  values: number[];
  /** Emoji per fruit type index ('max-distinct' levels only). */
  fruits?: string[];
  /** S (required sum) for 'min-sum', K (max distinct kinds) for 'max-distinct'. */
  target: number;
  /** Exact canonical move count — verified equal to canonicalActions(level) by tests. */
  par: number;
}

export interface BestWindow {
  l: number;
  r: number;
  len: number;
}

export interface WindowState {
  level: WindowLevel;
  /** Window is values[l..r]; l === r + 1 encodes an empty window. */
  l: number;
  r: number;
  best: BestWindow | null;
}

export const LEVELS: WindowLevel[] = [
  {
    id: 'sw-01',
    title: 'Two pointers, one pass',
    objective: 'Find the shortest window whose sum reaches 7.',
    lesson:
      'Both edges of the window only ever move right — L and R each cross the row at most once, so the whole hunt costs O(n), not the O(n²) of re-checking every window from scratch. The discipline is mechanical: sum below 7 means the window cannot qualify, so grow; sum at 7 or more means it qualifies, so shrink and see if something shorter survives.',
    mode: 'min-sum',
    values: [2, 3, 1, 2, 4, 3, 2, 1],
    target: 7,
    par: 12,
  },
  {
    id: 'sw-02',
    title: 'The tight squeeze',
    objective: 'Find the shortest window whose sum reaches 15.',
    lesson:
      'Shrinking while valid is where the answer hides: a fat qualifying window is only a lead, not a result. Somewhere mid-row two big chips sit side by side — keep squeezing every valid window until it breaks, and the recorder will catch the tight one on the way past.',
    mode: 'min-sum',
    values: [4, 2, 3, 8, 7, 2, 1, 3, 4, 2],
    target: 15,
    par: 14,
  },
  {
    id: 'sw-03',
    title: 'Fruit basket',
    objective: 'Find the longest stretch holding at most 2 kinds of fruit.',
    lesson:
      'This is the classic fruit-into-baskets problem: two baskets, one kind each, pick the longest run. The rule flips from the sum levels — a legal basket (≤ 2 kinds) should be stretched, and only a third kind forces you to drop fruit from the left until one kind falls out entirely.',
    mode: 'max-distinct',
    values: [0, 0, 1, 1, 0, 2, 2, 1, 2],
    fruits: ['🍎', '🍌', '🍒'],
    target: 2,
    par: 13,
  },
  {
    id: 'sw-04',
    title: 'Three-crate market',
    objective: 'Find the longest stretch holding at most 3 kinds of fruit.',
    lesson:
      'With 3 crates the shrinks come in bursts: when a fourth kind sneaks in, you may drop several fruits before a whole kind leaves the window. That is still O(n) — every chip enters the window once and leaves at most once, no matter how the shrinks cluster.',
    mode: 'max-distinct',
    values: [0, 1, 0, 2, 1, 3, 2, 2, 1, 3, 0],
    fruits: ['🍎', '🍌', '🍒', '🍇'],
    target: 3,
    par: 18,
  },
  {
    id: 'sw-05',
    title: 'Window boss',
    objective: 'Find the shortest window whose sum reaches 20.',
    lesson:
      'Fourteen chips, one rule, zero improvisation: invalid grows, valid shrinks. Follow it and you will touch each chip at most twice and still walk out with the provably shortest window — that inevitability is why sliding window is the first tool to reach for on contiguous-range problems.',
    mode: 'min-sum',
    values: [3, 5, 2, 8, 4, 2, 6, 9, 7, 3, 1, 4, 6, 2],
    target: 20,
    par: 22,
  },
];

export const LEVEL_IDS = LEVELS.map((level) => level.id);

export function getLevel(id: string): WindowLevel | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((level) => level.id === currentId);
  if (idx === -1 || idx === LEVELS.length - 1) return null;
  return LEVELS[idx + 1]!.id;
}

export function windowSum(state: WindowState): number {
  let sum = 0;
  for (let i = state.l; i <= state.r; i++) sum += state.level.values[i]!;
  return sum;
}

/** Occurrences of each value inside the window (fruit type → count). */
export function windowCounts(state: WindowState): Map<number, number> {
  const counts = new Map<number, number>();
  for (let i = state.l; i <= state.r; i++) {
    const v = state.level.values[i]!;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

export function windowDistinct(state: WindowState): number {
  return windowCounts(state).size;
}

/** The live meter reading: window sum ('min-sum') or distinct kinds ('max-distinct'). */
export function meterValue(state: WindowState): number {
  return state.level.mode === 'min-sum' ? windowSum(state) : windowDistinct(state);
}

export function isValidWindow(state: WindowState): boolean {
  return state.level.mode === 'min-sum'
    ? windowSum(state) >= state.level.target
    : windowDistinct(state) <= state.level.target;
}

/** Emoji for a fruit type index, or the number itself on sum levels. */
export function chipLabel(level: WindowLevel, value: number): string {
  return level.fruits?.[value] ?? String(value);
}

/**
 * The one legal move: 'min-sum' grows when invalid and shrinks when valid;
 * 'max-distinct' grows when valid and shrinks when invalid. When the rule
 * demands a grow but R already sits on the last chip, the run is done.
 */
export function forcedMove(state: WindowState): ForcedMove {
  const valid = isValidWindow(state);
  const atEnd = state.r === state.level.values.length - 1;
  const wantsGrow = state.level.mode === 'min-sum' ? !valid : valid;
  if (wantsGrow) return atEnd ? 'done' : 'grow';
  return 'shrink';
}

function withBestRecorded(state: WindowState): { state: WindowState; improved: boolean } {
  if (state.l > state.r || !isValidWindow(state)) return { state, improved: false };
  const len = state.r - state.l + 1;
  const better =
    state.best == null ||
    (state.level.mode === 'min-sum' ? len < state.best.len : len > state.best.len);
  if (!better) return { state, improved: false };
  return { state: { ...state, best: { l: state.l, r: state.r, len } }, improved: true };
}

export function createState(level: WindowLevel): WindowState {
  return withBestRecorded({ level, l: 0, r: 0, best: null }).state;
}

export type MoveResult =
  { ok: true; state: WindowState; improved: boolean } | { ok: false; forced: ForcedMove };

/** Apply a player move; anything other than forcedMove(state) is rejected. */
export function applyMove(state: WindowState, move: WindowMove): MoveResult {
  const forced = forcedMove(state);
  if (move !== forced) return { ok: false, forced };
  const next: WindowState =
    move === 'grow' ? { ...state, r: state.r + 1 } : { ...state, l: state.l + 1 };
  return { ok: true, ...withBestRecorded(next) };
}

export function isDone(state: WindowState): boolean {
  return forcedMove(state) === 'done';
}

/** Run the forced-move loop to completion; the final state holds the best window. */
export function runCanonical(level: WindowLevel): { state: WindowState; moves: number } {
  let state = createState(level);
  let moves = 0;
  const cap = level.values.length * 2 + 2;
  while (!isDone(state)) {
    const forced = forcedMove(state);
    if (forced === 'done') break;
    const result = applyMove(state, forced);
    if (!result.ok) break;
    state = result.state;
    moves += 1;
    if (moves > cap) throw new Error(`runCanonical: no convergence on ${level.id}`);
  }
  return { state, moves };
}

/** Exact canonical move count — the source of truth that par must equal. */
export function canonicalActions(level: WindowLevel): number {
  return runCanonical(level).moves;
}

/** Brute-force optimum window length over all O(n²) windows, for verification. */
export function bruteForceBest(level: WindowLevel): number | null {
  let best: number | null = null;
  for (let i = 0; i < level.values.length; i++) {
    let sum = 0;
    const seen = new Set<number>();
    for (let j = i; j < level.values.length; j++) {
      sum += level.values[j]!;
      seen.add(level.values[j]!);
      const ok = level.mode === 'min-sum' ? sum >= level.target : seen.size <= level.target;
      if (!ok) continue;
      const len = j - i + 1;
      if (best == null || (level.mode === 'min-sum' ? len < best : len > best)) best = len;
    }
  }
  return best;
}
