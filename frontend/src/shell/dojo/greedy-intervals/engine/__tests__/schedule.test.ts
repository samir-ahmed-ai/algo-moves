import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  LEVEL_IDS,
  assignLanes,
  bookValidity,
  compatibleIndices,
  earliestEndCandidates,
  exhaustiveOptimum,
  firstToStartCount,
  formatTime,
  getLevel,
  nextLevelId,
  overlaps,
  shortestFirstCount,
  simulateEarliestEnd,
  type Meeting,
  type ScheduleLevel,
} from '../schedule';

const m = (start: number, end: number, name = `${start}-${end}`): Meeting => ({
  name,
  start,
  end,
});

const level = (meetings: Meeting[], par = 99): ScheduleLevel => ({
  id: 'test',
  title: 'test',
  objective: '',
  lesson: '',
  dayStart: 540,
  dayEnd: 1020,
  meetings,
  par,
});

describe('overlaps', () => {
  it('detects partial and containing overlaps', () => {
    expect(overlaps(m(540, 600), m(570, 630))).toBe(true);
    expect(overlaps(m(540, 720), m(570, 600))).toBe(true);
  });

  it('treats a shared endpoint as compatible (back-to-back meetings)', () => {
    expect(overlaps(m(540, 600), m(600, 660))).toBe(false);
    expect(overlaps(m(600, 660), m(540, 600))).toBe(false);
  });

  it('is false for disjoint meetings', () => {
    expect(overlaps(m(540, 570), m(600, 660))).toBe(false);
  });
});

describe('compatibility and the earliest-end tie set', () => {
  const lv = level([m(540, 600), m(570, 690), m(630, 690), m(700, 730)]);

  it('filters out booked meetings and everything clashing with a booking', () => {
    expect(compatibleIndices(lv, [])).toEqual([0, 1, 2, 3]);
    expect(compatibleIndices(lv, [0])).toEqual([2, 3]);
    expect(compatibleIndices(lv, [0, 2])).toEqual([3]);
  });

  it('returns only the minimum-end compatible meetings', () => {
    expect(earliestEndCandidates(lv, [])).toEqual([0]);
    expect(earliestEndCandidates(lv, [0])).toEqual([2]);
    expect(earliestEndCandidates(lv, [0, 2, 3])).toEqual([]);
  });

  it('keeps every member of an end-time tie', () => {
    const tie = level([m(540, 600), m(560, 600), m(610, 640)]);
    expect(earliestEndCandidates(tie, [])).toEqual([0, 1]);
  });
});

describe('bookValidity', () => {
  const lv = level([m(540, 600, 'Standup'), m(570, 690, 'Demo'), m(630, 690, 'Retro')]);

  it('accepts the earliest-ending compatible meeting and reports completion', () => {
    const first = bookValidity(lv, [], 0);
    expect(first).toEqual({ ok: true, booked: [0], done: false });
    const second = bookValidity(lv, [0], 2);
    expect(second).toEqual({ ok: true, booked: [0, 2], done: true });
  });

  it('accepts either member of an end-time tie', () => {
    const tie = level([m(540, 600), m(560, 600)]);
    expect(bookValidity(tie, [], 0).ok).toBe(true);
    expect(bookValidity(tie, [], 1).ok).toBe(true);
  });

  it('rejects a later-ending compatible meeting with the better pick', () => {
    expect(bookValidity(lv, [], 1)).toEqual({ ok: false, reason: 'laterEnd', betterIndex: 0 });
  });

  it('rejects a meeting overlapping a booking with the conflict', () => {
    expect(bookValidity(lv, [0], 1)).toEqual({ ok: false, reason: 'overlap', conflictIndex: 0 });
  });

  it('rejects re-booking', () => {
    expect(bookValidity(lv, [0], 0)).toEqual({ ok: false, reason: 'alreadyBooked' });
  });
});

describe('formatTime', () => {
  it('renders h:mm', () => {
    expect(formatTime(540)).toBe('9:00');
    expect(formatTime(690)).toBe('11:30');
    expect(formatTime(605)).toBe('10:05');
  });
});

describe('levels', () => {
  it('exposes exactly the five registry level ids in order', () => {
    expect(LEVEL_IDS).toEqual(['gi-01', 'gi-02', 'gi-03', 'gi-04', 'gi-05']);
    expect(nextLevelId('gi-04')).toBe('gi-05');
    expect(nextLevelId('gi-05')).toBeNull();
  });

  it('sizes the boards per the design (3, 5, 4, 5, 9)', () => {
    expect(LEVELS.map((lv) => lv.meetings.length)).toEqual([3, 5, 4, 5, 9]);
  });

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s meetings are well-formed within the day and at most 9',
    (_id, lv) => {
      expect(lv.meetings.length).toBeLessThanOrEqual(9);
      for (const meeting of lv.meetings) {
        expect(meeting.start).toBeLessThan(meeting.end);
        expect(meeting.start).toBeGreaterThanOrEqual(lv.dayStart);
        expect(meeting.end).toBeLessThanOrEqual(lv.dayEnd);
      }
    },
  );

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s: par equals the exhaustive-search optimum',
    (_id, lv) => {
      expect(exhaustiveOptimum(lv)).toBe(lv.par);
    },
  );

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s: the earliest-end run books the optimum in exactly par actions',
    (_id, lv) => {
      const booked = simulateEarliestEnd(lv);
      expect(booked.length).toBe(lv.par);
      expect(booked.length).toBe(exhaustiveOptimum(lv));
      expect(compatibleIndices(lv, booked)).toEqual([]);
    },
  );

  it('gi-03: first-to-start greedy books fewer than the optimum', () => {
    const lv = getLevel('gi-03')!;
    expect(firstToStartCount(lv)).toBeLessThan(lv.par);
  });

  it('gi-04: shortest-first greedy books fewer than the optimum', () => {
    const lv = getLevel('gi-04')!;
    expect(shortestFirstCount(lv)).toBeLessThan(lv.par);
  });

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s: display lanes never stack overlapping meetings together',
    (_id, lv) => {
      const lanes = assignLanes(lv);
      for (let a = 0; a < lv.meetings.length; a++) {
        for (let b = a + 1; b < lv.meetings.length; b++) {
          if (lanes[a] === lanes[b]) {
            expect(overlaps(lv.meetings[a]!, lv.meetings[b]!)).toBe(false);
          }
        }
      }
    },
  );
});
