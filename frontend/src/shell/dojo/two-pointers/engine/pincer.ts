/**
 * Pure converging-two-pointers engine for the Pincer dojo game.
 * Pair-sum on a sorted array: L starts at the left end, R at the right end,
 * and every comparison against the target dictates the single legal move.
 * Validity, claiming, no-pair proofs and the canonical simulation all live
 * here so the React layer stays a thin shell.
 */

export type PointerKey = 'l' | 'h';

export interface PincerLevel {
  id: string;
  title: string;
  objective: string;
  lesson: string;
  /** Sorted ascending (duplicates allowed). */
  values: number[];
  target: number;
  par: number;
}

export interface PincerState {
  l: number;
  r: number;
}

export const LEVELS: PincerLevel[] = [
  {
    id: 'tp-01',
    title: 'First squeeze',
    objective: 'Find the pair that sums to 15.',
    lesson:
      'The array is sorted, so one comparison rules out a whole element. If arr[L] + arr[R] is too small, nothing to the left of R can rescue arr[L] — it is done, walk L right. Too big, and arr[R] can never work — walk R left. Each check discards an element forever; that is why this runs in one pass.',
    values: [1, 4, 6, 9, 12, 20],
    target: 15,
    par: 6,
  },
  {
    id: 'tp-02',
    title: 'Longer walk',
    objective: 'Find the pair that sums to 20.',
    lesson:
      'Feel the rhythm: compare, discard one end, repeat. Every element is visited at most once, so even a longer array falls in a single squeeze — no nested loops, no second chances needed. The comparison always tells you which pointer is safe to move.',
    values: [1, 4, 7, 9, 11, 15, 18, 21],
    target: 20,
    par: 8,
  },
  {
    id: 'tp-03',
    title: 'No such pair',
    objective: 'Prove whether any pair sums to 23.',
    lesson:
      'Sometimes the pair does not exist — and the pointers prove it. Every move discards an element that can never be in the answer, so when L and R meet, every element has been ruled out. That meeting is an exhaustive proof in one pass, no nested loops: declare it with x.',
    values: [2, 4, 7, 9, 12, 15, 18, 22],
    target: 23,
    par: 9,
  },
  {
    id: 'tp-04',
    title: 'Twins',
    objective: 'Find the pair that sums to 17 — duplicates lurk.',
    lesson:
      'Duplicates change nothing. The comparison drives on values, not positions: an equal neighbor just repeats the previous verdict, and the pointer walks straight past it. Trust the sum — the pincer never needs to know how many copies exist.',
    values: [1, 3, 3, 6, 8, 9, 12, 12, 15],
    target: 17,
    par: 9,
  },
  {
    id: 'tp-05',
    title: 'Grand pincer',
    objective: 'Twelve values, one pair summing to 40.',
    lesson:
      'This is the whole algorithm: while L < R, compare the sum to the target, move the pointer whose value is disqualified, claim on equality, declare no-pair when they meet. Twelve elements, one pass, at most eleven comparisons — the pincer closes on any sorted array.',
    values: [3, 7, 10, 13, 16, 19, 21, 26, 29, 32, 35, 38],
    target: 40,
    par: 12,
  },
];

export const LEVEL_IDS = LEVELS.map((level) => level.id);

export function getLevel(id: string): PincerLevel | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((level) => level.id === currentId);
  if (idx === -1 || idx === LEVELS.length - 1) return null;
  return LEVELS[idx + 1]!.id;
}

export function createState(level: PincerLevel): PincerState {
  return { l: 0, r: level.values.length - 1 };
}

export function sumAt(level: PincerLevel, state: PincerState): number {
  return level.values[state.l]! + level.values[state.r]!;
}

/** True once the pointers have met (or crossed) — the window is empty. */
export function crossed(state: PincerState): boolean {
  return state.l >= state.r;
}

/** True when some pair i < j sums to the target (ground truth for tests/UI). */
export function pairExists(level: PincerLevel): boolean {
  for (let i = 0; i < level.values.length; i++) {
    for (let j = i + 1; j < level.values.length; j++) {
      if (level.values[i]! + level.values[j]! === level.target) return true;
    }
  }
  return false;
}

export type MoveResult =
  | { ok: true; state: PincerState }
  /**
   * crossed — the pointers already met; needClaim — the sum equals the
   * target so moving would walk past the answer; wrongWay — the comparison
   * demands the other pointer.
   */
  | { ok: false; reason: 'crossed' | 'needClaim' | 'wrongWay' };

/** key 'l' walks L right (only legal when sum < target); 'h' walks R left (sum > target). */
export function moveValidity(level: PincerLevel, state: PincerState, key: PointerKey): MoveResult {
  if (crossed(state)) return { ok: false, reason: 'crossed' };
  const s = sumAt(level, state);
  if (s === level.target) return { ok: false, reason: 'needClaim' };
  if (key === 'l') {
    if (s > level.target) return { ok: false, reason: 'wrongWay' };
    return { ok: true, state: { l: state.l + 1, r: state.r } };
  }
  if (s < level.target) return { ok: false, reason: 'wrongWay' };
  return { ok: true, state: { l: state.l, r: state.r - 1 } };
}

export type ClaimResult = { ok: true } | { ok: false; reason: 'crossed' | 'tooSmall' | 'tooBig' };

/** Enter — claiming is only correct when the current sum equals the target. */
export function claimValidity(level: PincerLevel, state: PincerState): ClaimResult {
  if (crossed(state)) return { ok: false, reason: 'crossed' };
  const s = sumAt(level, state);
  if (s < level.target) return { ok: false, reason: 'tooSmall' };
  if (s > level.target) return { ok: false, reason: 'tooBig' };
  return { ok: true };
}

export type NoPairResult = { ok: true } | { ok: false; reason: 'notCrossed' | 'pairHere' };

/** x — declaring "no pair" is only correct once the pointers have met/crossed. */
export function noPairValidity(level: PincerLevel, state: PincerState): NoPairResult {
  if (crossed(state)) return { ok: true };
  if (sumAt(level, state) === level.target) return { ok: false, reason: 'pairHere' };
  return { ok: false, reason: 'notCrossed' };
}

export interface CanonicalRun {
  actions: number;
  outcome: 'pair' | 'noPair';
  state: PincerState;
}

/**
 * The textbook converging-pointers run: claim on equality, otherwise move the
 * dictated pointer; declare no-pair when the pointers meet. Every step is
 * validated through the same rules the player faces.
 */
export function simulateCanonical(level: PincerLevel): CanonicalRun {
  let state = createState(level);
  let actions = 0;
  for (let guard = 0; guard <= level.values.length; guard++) {
    if (crossed(state)) {
      if (!noPairValidity(level, state).ok) break;
      return { actions: actions + 1, outcome: 'noPair', state };
    }
    if (sumAt(level, state) === level.target) {
      if (!claimValidity(level, state).ok) break;
      return { actions: actions + 1, outcome: 'pair', state };
    }
    const key: PointerKey = sumAt(level, state) < level.target ? 'l' : 'h';
    const moved = moveValidity(level, state, key);
    if (!moved.ok) break;
    state = moved.state;
    actions += 1;
  }
  throw new Error(`canonical run failed to terminate for ${level.id}`);
}
