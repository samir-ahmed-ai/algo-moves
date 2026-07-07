import type { VimMotionKind } from './vimMotions';

export interface VimLevel {
  id: string;
  chapter: string;
  chapterNum: number;
  title: string;
  objective: string;
  lesson: string;
  allowed: VimMotionKind[];
  grid: string[];
  start: [number, number];
  goal: [number, number];
  parMoves?: number;
  hint: string;
}

export const VIM_LEVELS: VimLevel[] = [
  {
    id: 'basic-01',
    chapter: 'Survive',
    chapterNum: 1,
    title: 'First steps',
    objective: 'Reach the star using h, j, k, and l.',
    lesson:
      'In Normal mode, h/j/k/l move left/down/up/right — like arrow keys, but faster once muscle memory kicks in.',
    allowed: ['h', 'j', 'k', 'l'],
    grid: ['#####', '#.@.#', '#...#', '#..##', '#####'],
    start: [1, 2],
    goal: [2, 3],
    parMoves: 3,
    hint: 'Try j then l twice (down, right, right).',
  },
  {
    id: 'basic-02',
    chapter: 'Survive',
    chapterNum: 1,
    title: 'The corridor',
    objective: 'Navigate the zigzag path to the goal.',
    lesson:
      'Combine motions in sequence. Each keypress is one move — plan your route before you type.',
    allowed: ['h', 'j', 'k', 'l'],
    grid: ['#######', '#.@...#', '###.#.#', '#...#.#', '#.#####', '#.....#', '#######'],
    start: [1, 2],
    goal: [5, 5],
    parMoves: 12,
    hint: 'Follow the open floor cells — down the first hall, through the gap, then right.',
  },
  {
    id: 'words-01',
    chapter: 'Words',
    chapterNum: 2,
    title: 'Word forward',
    objective: 'Use w to leap to the next word on the line.',
    lesson:
      'w jumps to the start of the next word. Here, a "word" is a contiguous run of open cells.',
    allowed: ['h', 'j', 'k', 'l', 'w'],
    grid: ['##########', '#.@..##....#', '##########'],
    start: [1, 2],
    goal: [1, 7],
    parMoves: 2,
    hint: 'One w jumps from the first island to the second.',
  },
  {
    id: 'words-02',
    chapter: 'Words',
    chapterNum: 2,
    title: 'Back and end',
    objective: 'Reach the goal using w, b, and e.',
    lesson: 'b jumps backward to the previous word start. e jumps to the end of the current word.',
    allowed: ['h', 'j', 'k', 'l', 'w', 'b', 'e'],
    grid: ['###########', '#..@..#.....#', '###########'],
    start: [1, 3],
    goal: [1, 9],
    parMoves: 3,
    hint: 'w crosses gaps; e lands on the last cell of a run.',
  },
  {
    id: 'line-01',
    chapter: 'Line',
    chapterNum: 3,
    title: 'Line anchors',
    objective: 'Reach the far side with 0, $, and ^.',
    lesson:
      '0 and ^ jump to the first character of the line. $ jumps to the last character of the line.',
    allowed: ['h', 'j', 'k', 'l', '0', '$', '^'],
    grid: ['#########', '#.@.....#', '#########'],
    start: [1, 2],
    goal: [1, 7],
    parMoves: 1,
    hint: 'Press $ to teleport to the end of the row.',
  },
  {
    id: 'line-02',
    chapter: 'Line',
    chapterNum: 3,
    title: 'Island hop',
    objective: 'Cross islands efficiently with line motions.',
    lesson: 'Use $ and 0 to snap across long rows instead of tapping l repeatedly.',
    allowed: ['h', 'j', 'k', 'l', '0', '$', '^', 'w'],
    grid: ['#############', '#.@.........#', '#############'],
    start: [1, 2],
    goal: [1, 10],
    parMoves: 2,
    hint: '$ jumps to the end — one motion instead of many.',
  },
  {
    id: 'find-01',
    chapter: 'Find',
    chapterNum: 4,
    title: 'Find it',
    objective: 'Use fx to jump to the next x on this line.',
    lesson:
      'fx finds the next occurrence of character x on the current line and moves your cursor there.',
    allowed: ['h', 'j', 'k', 'l', 'f'],
    grid: ['#########', '#.@..x..#', '#########'],
    start: [1, 2],
    goal: [1, 5],
    parMoves: 1,
    hint: 'Press f then x.',
  },
  {
    id: 'find-02',
    chapter: 'Find',
    chapterNum: 4,
    title: 'Find variants',
    objective: 'Reach the goal using f, F, t, and T.',
    lesson: 'F finds backward. t lands before the character; T lands after it (going backward).',
    allowed: ['h', 'j', 'k', 'l', 'f', 'F', 't', 'T'],
    grid: ['###########', '#a..@..b..#', '###########'],
    start: [1, 4],
    goal: [1, 8],
    parMoves: 2,
    hint: 'fb finds b ahead on the line.',
  },
  {
    id: 'jump-01',
    chapter: 'Jump',
    chapterNum: 5,
    title: 'Top and bottom',
    objective: 'Reach the bottom row with gg and G.',
    lesson:
      'gg jumps to the top of the file. G jumps to the bottom line (same column when possible).',
    allowed: ['h', 'j', 'k', 'l', 'gg', 'G'],
    grid: ['#.#', '#@#', '#.#', '#.#', '#.#'],
    start: [1, 1],
    goal: [4, 1],
    parMoves: 1,
    hint: 'G teleports to the last line.',
  },
  {
    id: 'jump-02',
    chapter: 'Jump',
    chapterNum: 5,
    title: 'Go to line',
    objective: 'Use nG to jump to a specific line number.',
    lesson: '4G jumps to line 4. Combine with horizontal motion to finish the route.',
    allowed: ['h', 'j', 'k', 'l', 'gg', 'G', 'nG'],
    grid: ['#####', '#.@#', '#####', '#...#', '#####'],
    start: [1, 2],
    goal: [3, 3],
    parMoves: 2,
    hint: '4G jumps to line 4, then l reaches the goal.',
  },
  {
    id: 'boss-01',
    chapter: 'Boss',
    chapterNum: 6,
    title: 'Mixed motions',
    objective: 'Combine word, line, and find motions.',
    lesson: 'Real editing mixes motions — scan the maze and pick the shortest Vim sequence.',
    allowed: ['h', 'j', 'k', 'l', 'w', 'b', 'e', '0', '$', '^', 'f', 'F', 't', 'T'],
    grid: ['###########', '#.@....x..#', '###########'],
    start: [1, 2],
    goal: [1, 7],
    parMoves: 2,
    hint: 'w then fx — or $ if you see a shorter path.',
  },
  {
    id: 'boss-02',
    chapter: 'Boss',
    chapterNum: 6,
    title: 'Dojo master',
    objective: 'Escape the vault using every motion you have learned.',
    lesson: 'You now speak Vim. G anchors the bottom; f finds targets on a line; w leaps gaps.',
    allowed: [
      'h',
      'j',
      'k',
      'l',
      'w',
      'b',
      'e',
      '0',
      '$',
      '^',
      'f',
      'F',
      't',
      'T',
      'gg',
      'G',
      'nG',
    ],
    grid: [
      '#########',
      '#.@.....#',
      '###.x.###',
      '#.......#',
      '#..###..#',
      '#.....g.#',
      '#########',
    ],
    start: [1, 2],
    goal: [5, 6],
    parMoves: 8,
    hint: 'Drop with j, find x with fx, cross with w, finish with l.',
  },
];

export const VIM_LEVEL_IDS = VIM_LEVELS.map((l) => l.id);

/** Short student-facing description for each motion, used in intros and tooltips. */
export const MOTION_HELP: Record<VimMotionKind, string> = {
  h: 'move left',
  j: 'move down',
  k: 'move up',
  l: 'move right',
  w: 'next word start',
  b: 'previous word start',
  e: 'end of word',
  '0': 'start of line',
  $: 'end of line',
  '^': 'first character of line',
  f: 'find character →',
  F: 'find character ←',
  t: 'till before character →',
  T: 'till after character ←',
  gg: 'top of file',
  G: 'bottom of file',
  nG: 'go to line n',
};

/** Motions introduced by this level — allowed here but never allowed in an earlier level. */
export function newMotionsForLevel(level: VimLevel): VimMotionKind[] {
  const idx = VIM_LEVELS.findIndex((l) => l.id === level.id);
  const seen = new Set<VimMotionKind>();
  for (let i = 0; i < idx; i++) {
    for (const kind of VIM_LEVELS[i]!.allowed) seen.add(kind);
  }
  return level.allowed.filter((kind) => !seen.has(kind));
}

export type VimStars = 1 | 2 | 3;

/** Star rating for a completed level: 3 at or under par, 2 within 1.5× par, 1 otherwise. */
export function starsForMoves(moves: number, parMoves?: number | null): VimStars {
  if (parMoves == null) return 3;
  if (moves <= parMoves) return 3;
  if (moves <= Math.ceil(parMoves * 1.5)) return 2;
  return 1;
}

export function getVimLevel(id: string): VimLevel | undefined {
  return VIM_LEVELS.find((l) => l.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = VIM_LEVELS.findIndex((l) => l.id === currentId);
  if (idx < 0 || idx >= VIM_LEVELS.length - 1) return null;
  return VIM_LEVELS[idx + 1]!.id;
}

export function chaptersFromLevels(
  levels: VimLevel[],
): { chapter: string; chapterNum: number; levels: VimLevel[] }[] {
  const map = new Map<string, { chapter: string; chapterNum: number; levels: VimLevel[] }>();
  for (const level of levels) {
    const key = `${level.chapterNum}:${level.chapter}`;
    if (!map.has(key)) {
      map.set(key, { chapter: level.chapter, chapterNum: level.chapterNum, levels: [] });
    }
    map.get(key)!.levels.push(level);
  }
  return [...map.values()].sort((a, b) => a.chapterNum - b.chapterNum);
}
