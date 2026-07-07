/**
 * Pure greedy interval-scheduling engine for the Meeting Mania dojo game.
 * Maximize non-overlapping meetings by always booking the compatible one
 * that ends earliest. Compatibility, the earliest-end rule (with tie sets),
 * booking validity, reference optima and the level data all live here so
 * the React layer stays a thin shell.
 */

export interface Meeting {
  name: string;
  /** Minutes since midnight. */
  start: number;
  /** Minutes since midnight; end === next.start does NOT overlap. */
  end: number;
}

export interface ScheduleLevel {
  id: string;
  title: string;
  objective: string;
  lesson: string;
  /** Timeline bounds in minutes since midnight. */
  dayStart: number;
  dayEnd: number;
  meetings: Meeting[];
  /** Optimal booking count — a clean run spends exactly this many actions. */
  par: number;
}

export const LEVELS: ScheduleLevel[] = [
  {
    id: 'gi-01',
    title: "Three's company",
    objective: 'Book as many non-overlapping meetings as possible.',
    lesson:
      'Two meetings clash when one starts before the other ends. To fit the most in, always book the compatible meeting that ENDS EARLIEST — finishing sooner leaves the rest of the day open for everything else. Here the long Demo tempts you, but it swallows the slots of two shorter meetings.',
    dayStart: 540,
    dayEnd: 720,
    meetings: [
      { name: 'Standup', start: 540, end: 600 },
      { name: 'Demo', start: 570, end: 690 },
      { name: 'Retro', start: 630, end: 690 },
    ],
    par: 2,
  },
  {
    id: 'gi-02',
    title: 'Busy morning',
    objective: 'Book as many non-overlapping meetings as possible.',
    lesson:
      'Feel the rhythm: book the earliest-ending compatible meeting, cross out everything it clashes with, repeat. Each booking is provably safe — any schedule that used a later-ending meeting instead could swap in yours without losing anything. Back-to-back is fine: a 10:30 end and a 10:30 start do not overlap.',
    dayStart: 540,
    dayEnd: 780,
    meetings: [
      { name: 'Standup', start: 540, end: 570 },
      { name: 'Kickoff', start: 555, end: 645 },
      { name: '1:1 with Maya', start: 585, end: 630 },
      { name: 'Design sync', start: 630, end: 690 },
      { name: 'Lunch & learn', start: 660, end: 720 },
    ],
    par: 3,
  },
  {
    id: 'gi-03',
    title: 'The long tempter',
    objective: 'Book as many non-overlapping meetings as possible.',
    lesson:
      'Why not just grab whatever starts first? The All-hands starts at 9:00 — but booking it wipes out two short meetings that fit inside its span. First-to-start greedy books 2 here; earliest-end books 3. Start times tell you nothing about what you give up — end times do.',
    dayStart: 540,
    dayEnd: 720,
    meetings: [
      { name: 'All-hands', start: 540, end: 660 },
      { name: 'Standup', start: 570, end: 600 },
      { name: 'Coffee chat', start: 615, end: 645 },
      { name: 'Demo', start: 660, end: 720 },
    ],
    par: 3,
  },
  {
    id: 'gi-04',
    title: "Shortest isn't safest",
    objective: 'Book as many non-overlapping meetings as possible.',
    lesson:
      'Surely the shortest meeting is the cheapest to book? Not when it straddles two others: the 30-minute Quick huddle kills both hour-long syncs it overlaps. Shortest-first books 3 here; earliest-end books 4. Duration measures the meeting — the end time measures what it leaves behind.',
    dayStart: 540,
    dayEnd: 780,
    meetings: [
      { name: 'Sync A', start: 540, end: 600 },
      { name: 'Quick huddle', start: 585, end: 615 },
      { name: 'Sync B', start: 600, end: 660 },
      { name: 'Review', start: 660, end: 720 },
      { name: 'Wrap-up', start: 720, end: 780 },
    ],
    par: 4,
  },
  {
    id: 'gi-05',
    title: 'Conference crunch',
    objective: 'Book as many non-overlapping meetings as possible.',
    lesson:
      'The whole algorithm: sort by end time, sweep once, book whatever fits. Nine meetings, five bookings, no backtracking — the earliest-end rule is provably optimal because every booking it makes frees at least as much of the day as any alternative. Long blockbusters and sly overlaps alike fall to one pass.',
    dayStart: 540,
    dayEnd: 840,
    meetings: [
      { name: 'Standup', start: 540, end: 570 },
      { name: 'Keynote', start: 540, end: 660 },
      { name: '1:1 with Sam', start: 570, end: 615 },
      { name: 'Board sync', start: 585, end: 690 },
      { name: 'Workshop', start: 600, end: 720 },
      { name: 'Demo', start: 615, end: 660 },
      { name: 'Lunch panel', start: 690, end: 750 },
      { name: 'Deep dive', start: 720, end: 840 },
      { name: 'Retro', start: 750, end: 810 },
    ],
    par: 5,
  },
];

export const LEVEL_IDS = LEVELS.map((level) => level.id);

export function getLevel(id: string): ScheduleLevel | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((level) => level.id === currentId);
  if (idx === -1 || idx === LEVELS.length - 1) return null;
  return LEVELS[idx + 1]!.id;
}

/** "9:05" style label for minutes since midnight. */
export function formatTime(min: number): string {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

/** Open intervals: sharing an endpoint (a.end === b.start) is NOT an overlap. */
export function overlaps(a: Meeting, b: Meeting): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Unbooked meetings that clash with none of the current bookings. */
export function compatibleIndices(level: ScheduleLevel, booked: readonly number[]): number[] {
  return level.meetings
    .map((_, i) => i)
    .filter(
      (i) =>
        !booked.includes(i) &&
        booked.every((b) => !overlaps(level.meetings[i]!, level.meetings[b]!)),
    );
}

/** The tie set: every compatible meeting sharing the minimum end time. */
export function earliestEndCandidates(level: ScheduleLevel, booked: readonly number[]): number[] {
  const compat = compatibleIndices(level, booked);
  if (compat.length === 0) return [];
  const minEnd = Math.min(...compat.map((i) => level.meetings[i]!.end));
  return compat.filter((i) => level.meetings[i]!.end === minEnd);
}

export type BookResult =
  | { ok: true; booked: number[]; done: boolean }
  | { ok: false; reason: 'alreadyBooked' }
  /** overlap — clashes with a booking; laterEnd — compatible but a candidate ends earlier. */
  | { ok: false; reason: 'overlap'; conflictIndex: number }
  | { ok: false; reason: 'laterEnd'; betterIndex: number };

/** A booking is correct iff the meeting is compatible AND in the earliest-end tie set. */
export function bookValidity(
  level: ScheduleLevel,
  booked: readonly number[],
  index: number,
): BookResult {
  if (booked.includes(index)) return { ok: false, reason: 'alreadyBooked' };
  const meeting = level.meetings[index]!;
  const conflict = booked.find((b) => overlaps(meeting, level.meetings[b]!));
  if (conflict !== undefined) return { ok: false, reason: 'overlap', conflictIndex: conflict };
  const candidates = earliestEndCandidates(level, booked);
  if (!candidates.includes(index)) {
    return { ok: false, reason: 'laterEnd', betterIndex: candidates[0]! };
  }
  const next = [...booked, index];
  return { ok: true, booked: next, done: compatibleIndices(level, next).length === 0 };
}

function pairwiseCompatible(level: ScheduleLevel, indices: number[]): boolean {
  for (let a = 0; a < indices.length; a++) {
    for (let b = a + 1; b < indices.length; b++) {
      if (overlaps(level.meetings[indices[a]!]!, level.meetings[indices[b]!]!)) return false;
    }
  }
  return true;
}

/** Ground-truth maximum via brute force over all subsets (levels stay ≤ 9 meetings). */
export function exhaustiveOptimum(level: ScheduleLevel): number {
  const n = level.meetings.length;
  let best = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    const indices: number[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) indices.push(i);
    if (indices.length > best && pairwiseCompatible(level, indices)) best = indices.length;
  }
  return best;
}

/** The textbook run: book an earliest-end candidate until nothing fits, via the player's rules. */
export function simulateEarliestEnd(level: ScheduleLevel): number[] {
  let booked: number[] = [];
  for (let guard = 0; guard <= level.meetings.length; guard++) {
    const candidates = earliestEndCandidates(level, booked);
    if (candidates.length === 0) return booked;
    const result = bookValidity(level, booked, candidates[0]!);
    if (!result.ok) break;
    booked = result.booked;
    if (result.done) return booked;
  }
  throw new Error(`earliest-end run failed to terminate for ${level.id}`);
}

function simulateHeuristic(
  level: ScheduleLevel,
  beats: (a: Meeting, b: Meeting) => boolean,
): number {
  const booked: number[] = [];
  for (let guard = 0; guard <= level.meetings.length; guard++) {
    const compat = compatibleIndices(level, booked);
    if (compat.length === 0) return booked.length;
    let pick = compat[0]!;
    for (const i of compat) {
      if (beats(level.meetings[i]!, level.meetings[pick]!)) pick = i;
    }
    booked.push(pick);
  }
  throw new Error(`heuristic run failed to terminate for ${level.id}`);
}

/** The flawed "grab whatever starts first" strategy (gi-03's trap). */
export function firstToStartCount(level: ScheduleLevel): number {
  return simulateHeuristic(level, (a, b) => a.start < b.start);
}

/** The flawed "grab the shortest meeting" strategy (gi-04's trap). */
export function shortestFirstCount(level: ScheduleLevel): number {
  return simulateHeuristic(level, (a, b) => a.end - a.start < b.end - b.start);
}

/** First-fit display lanes so overlapping meetings stack instead of colliding. */
export function assignLanes(level: ScheduleLevel): number[] {
  const order = level.meetings
    .map((_, i) => i)
    .sort(
      (a, b) =>
        level.meetings[a]!.start - level.meetings[b]!.start ||
        level.meetings[a]!.end - level.meetings[b]!.end,
    );
  const laneEnds: number[] = [];
  const lanes = new Array<number>(level.meetings.length).fill(0);
  for (const i of order) {
    const meeting = level.meetings[i]!;
    let lane = laneEnds.findIndex((end) => end <= meeting.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(meeting.end);
    } else {
      laneEnds[lane] = meeting.end;
    }
    lanes[i] = lane;
  }
  return lanes;
}
