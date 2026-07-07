/**
 * Pure monotonic-stack engine for the Skyline Stack dojo game.
 * Bars are processed left→right; the stack holds indices of bars still
 * waiting for their "next greater" bar (heights non-increasing bottom→top).
 * Pop resolves the top against the incoming bar; push admits the incoming
 * bar; after the last push the remaining stack sweeps to "none".
 */

/** Per-bar resolution: index of its next greater bar, 'none', or unresolved. */
export type Answer = number | 'none' | null;

export interface SkylineLevel {
  id: string;
  title: string;
  objective: string;
  lesson: string;
  heights: number[];
  /** Exact pushes + pops of the one-pass algorithm (n + number of popped bars). */
  par: number;
  /** Daily-temperatures theming: answers read as "wait d days". */
  theme?: 'days';
}

export interface SkylineState {
  level: SkylineLevel;
  /** Index of the incoming bar; heights.length once every bar is pushed. */
  next: number;
  /** Indices of waiting bars, bottom → top. Heights are non-increasing. */
  stack: number[];
  answers: Answer[];
  pushes: number;
  pops: number;
}

export const LEVELS: SkylineLevel[] = [
  {
    id: 'ms-01',
    title: 'Rising city',
    objective: 'Find every bar’s next greater bar in a rising skyline.',
    lesson:
      'Heights only climb, so each incoming bar towers over the stack top: pop it (that’s its answer), then push. The stack never holds more than one bar — every newcomer immediately answers the previous one.',
    heights: [1, 3, 4, 6, 8],
    par: 9,
  },
  {
    id: 'ms-02',
    title: 'Falling city',
    objective: 'Process a falling skyline — then watch the sweep answer everyone.',
    lesson:
      'A falling skyline never pops: each bar is shorter than the top, so it just stacks up and the stack holds the whole skyline in decreasing order. Nothing resolves until the end sweep, when every waiting bar learns that no greater bar ever came.',
    heights: [8, 6, 5, 3, 2],
    par: 5,
  },
  {
    id: 'ms-03',
    title: 'Classic block',
    objective: 'Annotate the classic [2, 1, 2, 4, 3] block, ties and all.',
    lesson:
      '“Next greater” means strictly taller — when a 2 meets a 2 on top, nothing pops; the newcomer just stacks on. Then watch the 4 arrive and clear two waiting bars in a row: one tall newcomer can resolve a whole run at once.',
    heights: [2, 1, 2, 4, 3],
    par: 8,
  },
  {
    id: 'ms-04',
    title: 'Warmer days',
    objective: 'For each day’s temperature, find how many days until a warmer one.',
    lesson:
      'Same stack, new story: each bar is a day’s temperature and each answer becomes “wait d days” — the gap between the two indices. This is the Daily Temperatures problem, and it is the exact same pop-when-taller loop you already know.',
    heights: [6, 7, 3, 2, 4, 8, 5, 4],
    par: 13,
    theme: 'days',
  },
  {
    id: 'ms-05',
    title: 'Metropolis',
    objective: 'Annotate all ten bars of the metropolis in a single pass.',
    lesson:
      'Ten bars, one pass. Some keystrokes pop several waiting bars, yet no bar is ever examined again once it leaves: every bar is pushed exactly once and popped exactly once, which is why this whole skyline costs O(n) — not O(n²).',
    heights: [4, 7, 2, 3, 7, 5, 6, 9, 3, 5],
    par: 18,
  },
];

export const LEVEL_IDS = LEVELS.map((level) => level.id);

export function getLevel(id: string): SkylineLevel | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((level) => level.id === currentId);
  if (idx === -1 || idx === LEVELS.length - 1) return null;
  return LEVELS[idx + 1]!.id;
}

export function createState(level: SkylineLevel): SkylineState {
  return {
    level,
    next: 0,
    stack: [],
    answers: level.heights.map(() => null),
    pushes: 0,
    pops: 0,
  };
}

export function stackTop(state: SkylineState): number | undefined {
  return state.stack[state.stack.length - 1];
}

/** True once every bar has been pushed (only the sweep may remain). */
export function inputDone(state: SkylineState): boolean {
  return state.next >= state.level.heights.length;
}

/** The stack top is strictly shorter than the incoming bar — it must pop. */
export function mustPop(state: SkylineState): boolean {
  if (inputDone(state)) return false;
  const top = stackTop(state);
  if (top === undefined) return false;
  return state.level.heights[top]! < state.level.heights[state.next]!;
}

/** The incoming bar may be pushed (stack empty or top tall enough). */
export function canPush(state: SkylineState): boolean {
  return !inputDone(state) && !mustPop(state);
}

export type PopResult =
  | { ok: true; state: SkylineState; resolved: number; by: number }
  | { ok: false; reason: 'empty' | 'topTallEnough' | 'inputDone'; top?: number };

/** Pop the top bar: the incoming bar is its next greater. */
export function popResolve(state: SkylineState): PopResult {
  if (inputDone(state)) return { ok: false, reason: 'inputDone' };
  const top = stackTop(state);
  if (top === undefined) return { ok: false, reason: 'empty' };
  if (state.level.heights[top]! >= state.level.heights[state.next]!) {
    return { ok: false, reason: 'topTallEnough', top };
  }
  const answers = state.answers.slice();
  answers[top] = state.next;
  return {
    ok: true,
    state: { ...state, stack: state.stack.slice(0, -1), answers, pops: state.pops + 1 },
    resolved: top,
    by: state.next,
  };
}

export type PushResult =
  | { ok: true; state: SkylineState; pushed: number; wasLast: boolean }
  | { ok: false; reason: 'mustPop' | 'inputDone'; top?: number };

/** Push the incoming bar onto the stack and advance. */
export function pushNext(state: SkylineState): PushResult {
  if (inputDone(state)) return { ok: false, reason: 'inputDone' };
  if (mustPop(state)) return { ok: false, reason: 'mustPop', top: stackTop(state)! };
  return {
    ok: true,
    state: {
      ...state,
      stack: [...state.stack, state.next],
      next: state.next + 1,
      pushes: state.pushes + 1,
    },
    pushed: state.next,
    wasLast: state.next + 1 >= state.level.heights.length,
  };
}

/** Bars remain on the stack after the last push — the end sweep is due. */
export function needsSweep(state: SkylineState): boolean {
  return inputDone(state) && state.stack.length > 0;
}

/** Resolve the current stack top to 'none' (end sweep; not a player action). */
export function sweepOne(state: SkylineState): { state: SkylineState; resolved: number } | null {
  if (!needsSweep(state)) return null;
  const top = stackTop(state)!;
  const answers = state.answers.slice();
  answers[top] = 'none';
  return {
    state: { ...state, stack: state.stack.slice(0, -1), answers },
    resolved: top,
  };
}

export function isComplete(state: SkylineState): boolean {
  return inputDone(state) && state.stack.length === 0;
}

/** Ground truth: first strictly taller bar to the right, or 'none'. */
export function bruteForceNextGreater(heights: number[]): (number | 'none')[] {
  return heights.map((h, i) => {
    for (let j = i + 1; j < heights.length; j += 1) {
      if (heights[j]! > h) return j;
    }
    return 'none';
  });
}

/** Run the one-pass algorithm through the engine ops, sweep included. */
export function simulate(level: SkylineLevel): SkylineState {
  let state = createState(level);
  while (!inputDone(state)) {
    while (mustPop(state)) {
      const popped = popResolve(state);
      if (!popped.ok) throw new Error(`simulate: pop refused on ${level.id}`);
      state = popped.state;
    }
    const pushed = pushNext(state);
    if (!pushed.ok) throw new Error(`simulate: push refused on ${level.id}`);
    state = pushed.state;
  }
  let swept = sweepOne(state);
  while (swept) {
    state = swept.state;
    swept = sweepOne(state);
  }
  return state;
}

/** Par from first principles: n pushes + one pop per bar with a real answer. */
export function computePar(heights: number[]): number {
  const popped = bruteForceNextGreater(heights).filter((a) => a !== 'none').length;
  return heights.length + popped;
}
