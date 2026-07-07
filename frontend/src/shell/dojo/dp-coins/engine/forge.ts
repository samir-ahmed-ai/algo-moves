/**
 * Pure bottom-up DP engine for the Coin Forge dojo game (min coin change).
 * The table dp[0..n] fills left to right: dp[0] = 0, and every later cell is
 * forged from an already-solved subproblem — dp[i] = 1 + min(dp[i - c]) over
 * coins c that fit. Unreachable cells are stamped ∞. Validity rules, the
 * reference solver, greedy comparison and the traceback all live here so the
 * React layer stays a thin shell.
 */

export interface ForgeLevel {
  id: string;
  title: string;
  objective: string;
  lesson: string;
  /** Coin denominations, ascending, single digit (they double as keycaps). */
  coins: number[];
  /** Target amount — the table runs dp[0..n]. */
  n: number;
  par: number;
}

/** A cell is null until filled; Infinity marks a stamped-unreachable cell. */
export type DpCell = number | null;

export const LEVELS: ForgeLevel[] = [
  {
    id: 'dc-01',
    title: "Greedy's downfall",
    objective: 'Fill dp[0..6] for coins {1, 3, 4} and forge 6¢ in the fewest coins.',
    lesson:
      'Greedy grabs the biggest coin first: for 6¢ it takes 4 + 1 + 1 = 3 coins. The table disagrees — dp[6] forges from dp[3], and 3 + 3 does it in 2. That is the whole point of bottom-up DP: big answers are forged from solved subproblems. Every cell asks each coin "what did the past already prove?" — dp[i] = 1 + dp[i − c] — and keeps the minimum, never a guess.',
    coins: [1, 3, 4],
    n: 6,
    par: 6,
  },
  {
    id: 'dc-02',
    title: 'Corner shop',
    objective: 'Fill dp[0..11] for coins {1, 2, 5} and forge 11¢ in the fewest coins.',
    lesson:
      'A longer table, same forge. At each cell, every coin points back to a cell you already solved — 1¢ reads dp[i − 1], 2¢ reads dp[i − 2], 5¢ reads dp[i − 5]. Compare the three candidates 1 + dp[i − c] and take the cheapest. The left of the table is settled law; the right is built from it, one cell per action.',
    coins: [1, 2, 5],
    n: 11,
    par: 11,
  },
  {
    id: 'dc-03',
    title: 'Gaps in the till',
    objective: 'Fill dp[0..9] for coins {2, 5} — some amounts cannot be made at all.',
    lesson:
      'No 1¢ coin this time, so some amounts are simply impossible: nothing makes 1¢ or 3¢ from {2, 5}. ∞ is an answer too — stamp it with x when every reference is ∞ or no coin fits. The stamp matters: later cells that look back at an ∞ cell learn that path is dead, and route around it.',
    coins: [2, 5],
    n: 9,
    par: 9,
  },
  {
    id: 'dc-04',
    title: 'Forge ahead',
    objective: 'Fill dp[0..10] for coins {1, 3, 4} and forge 10¢ in the fewest coins.',
    lesson:
      'The same treacherous coin set as level one, stretched to 10¢. Greedy stumbles again along the way — trust only the table. Each candidate 1 + dp[i − c] is a finished proof, and the minimum of finished proofs is itself a proof. That invariant is why the fill order (left to right) is the whole algorithm.',
    coins: [1, 3, 4],
    n: 10,
    par: 10,
  },
  {
    id: 'dc-05',
    title: 'Master smith',
    objective: 'Boss forge: fill dp[0..14] for coins {1, 2, 5, 7} and make 14¢ optimally.',
    lesson:
      'Four coins, fourteen cells, no safety net. This is the full recurrence: dp[i] = 1 + min over c of dp[i − c], scanning every denomination at every cell. When dp[14] lands, the traceback walks the minimum steps home — each hop of exactly one coin — and hands you the optimal multiset. Forge with care, smith.',
    coins: [1, 2, 5, 7],
    n: 14,
    par: 14,
  },
];

export const LEVEL_IDS = LEVELS.map((level) => level.id);

export function getLevel(id: string): ForgeLevel | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((level) => level.id === currentId);
  if (idx === -1 || idx === LEVELS.length - 1) return null;
  return LEVELS[idx + 1]!.id;
}

/** Fresh table: dp[0] = 0 pre-filled, every other cell empty. */
export function createDp(level: ForgeLevel): DpCell[] {
  const dp: DpCell[] = Array.from({ length: level.n + 1 }, () => null);
  dp[0] = 0;
  return dp;
}

/** Leftmost unfilled cell, or -1 when the table is complete. */
export function currentCell(dp: DpCell[]): number {
  const idx = dp.findIndex((cell) => cell === null);
  return idx;
}

export interface Candidate {
  coin: number;
  /** The referenced subproblem index i − coin. */
  ref: number;
  /** 1 + dp[ref]; Infinity when the reference is unreachable. */
  candidate: number;
}

/** All coins that fit into cell i, with their referenced values (may be Infinity). */
export function candidatesAt(dp: DpCell[], i: number, coins: number[]): Candidate[] {
  const out: Candidate[] = [];
  for (const coin of coins) {
    if (coin > i) continue;
    const refValue = dp[i - coin];
    if (refValue === null || refValue === undefined) continue;
    out.push({ coin, ref: i - coin, candidate: refValue + 1 });
  }
  return out;
}

/** The finite minimum-candidate coins at cell i (empty ⇒ the cell must be stamped ∞). */
export function bestCandidates(dp: DpCell[], i: number, coins: number[]): Candidate[] {
  const finite = candidatesAt(dp, i, coins).filter((c) => Number.isFinite(c.candidate));
  if (finite.length === 0) return [];
  const min = Math.min(...finite.map((c) => c.candidate));
  return finite.filter((c) => c.candidate === min);
}

export type FillResult =
  | { ok: true; value: number; ref: number }
  /**
   * doesntFit — the coin is larger than the amount; unreachableRef — the
   * referenced cell is ∞; suboptimal — a cheaper past exists; mustStamp —
   * no coin reaches this cell, it must be stamped ∞ instead.
   */
  | { ok: false; reason: 'doesntFit' }
  | { ok: false; reason: 'mustStamp' }
  | { ok: false; reason: 'unreachableRef'; best: Candidate }
  | { ok: false; reason: 'suboptimal'; chosen: Candidate; best: Candidate };

/** Pressing coin `coin` at cell i: legal only for a minimum finite candidate. */
export function fillValidity(dp: DpCell[], i: number, coin: number, coins: number[]): FillResult {
  if (coin > i) return { ok: false, reason: 'doesntFit' };
  const best = bestCandidates(dp, i, coins);
  if (best.length === 0) return { ok: false, reason: 'mustStamp' };
  const refValue = dp[i - coin];
  const chosen: Candidate = { coin, ref: i - coin, candidate: (refValue ?? Infinity) + 1 };
  if (!Number.isFinite(chosen.candidate)) {
    return { ok: false, reason: 'unreachableRef', best: best[0]! };
  }
  if (chosen.candidate > best[0]!.candidate) {
    return { ok: false, reason: 'suboptimal', chosen, best: best[0]! };
  }
  return { ok: true, value: chosen.candidate, ref: chosen.ref };
}

export type StampResult = { ok: true } | { ok: false; best: Candidate };

/** Pressing x at cell i: legal only when no coin yields a finite candidate. */
export function stampInfinityValidity(dp: DpCell[], i: number, coins: number[]): StampResult {
  const best = bestCandidates(dp, i, coins);
  if (best.length === 0) return { ok: true };
  return { ok: false, best: best[0]! };
}

/** Ground-truth solver: the completed table for a coin set (Infinity = unreachable). */
export function solveReference(coins: number[], n: number): number[] {
  const dp: number[] = Array.from({ length: n + 1 }, () => Infinity);
  dp[0] = 0;
  for (let i = 1; i <= n; i++) {
    for (const coin of coins) {
      if (coin <= i) dp[i] = Math.min(dp[i]!, dp[i - coin]! + 1);
    }
  }
  return dp;
}

export interface Traceback {
  /** The coin multiset forging n, in traceback order (n → 0). */
  coins: number[];
  /** The visited cell path, n first, 0 last. */
  cells: number[];
}

/** Walk dp[n] home: at each cell pick a coin whose reference is exactly one cheaper. */
export function traceback(dp: DpCell[], coins: number[], n: number): Traceback | null {
  if (!Number.isFinite(dp[n] ?? Infinity)) return null;
  const pickedCoins: number[] = [];
  const cells: number[] = [n];
  let i = n;
  while (i > 0) {
    const step = coins.find(
      (coin) => coin <= i && dp[i - coin] !== null && dp[i - coin] === (dp[i] as number) - 1,
    );
    if (step === undefined) return null;
    pickedCoins.push(step);
    i -= step;
    cells.push(i);
  }
  return { coins: pickedCoins, cells };
}

/** Largest-coin-first greedy; Infinity when greedy gets stuck. */
export function greedyCount(coins: number[], n: number): number {
  const sorted = [...coins].sort((a, b) => b - a);
  let remaining = n;
  let count = 0;
  while (remaining > 0) {
    const coin = sorted.find((c) => c <= remaining);
    if (coin === undefined) return Infinity;
    remaining -= coin;
    count += 1;
  }
  return count;
}

export interface CanonicalRun {
  actions: number;
  dp: DpCell[];
}

/**
 * The textbook run: at each cell fill via a minimum candidate, or stamp ∞
 * when none exists. Every step is validated through the player-facing rules.
 */
export function simulateCanonical(level: ForgeLevel): CanonicalRun {
  const dp = createDp(level);
  let actions = 0;
  for (let i = 1; i <= level.n; i++) {
    const best = bestCandidates(dp, i, level.coins);
    if (best.length === 0) {
      const stamp = stampInfinityValidity(dp, i, level.coins);
      if (!stamp.ok) throw new Error(`canonical stamp rejected at ${level.id} cell ${i}`);
      dp[i] = Infinity;
    } else {
      const fill = fillValidity(dp, i, best[0]!.coin, level.coins);
      if (!fill.ok) throw new Error(`canonical fill rejected at ${level.id} cell ${i}`);
      dp[i] = fill.value;
    }
    actions += 1;
  }
  return { actions, dp };
}
