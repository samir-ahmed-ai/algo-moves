import { describe, expect, it } from 'vitest';
import { activityHeatmap, activityTotals, computeDayStreak, dayKey } from './activity';

const now = new Date(2026, 6, 9); // Thu 2026-07-09 (local)
const daysAgo = (n: number): string => dayKey(new Date(now.getTime() - n * 86_400_000));

describe('computeDayStreak', () => {
  it('counts consecutive active days ending today', () => {
    const days = { [daysAgo(0)]: 2, [daysAgo(1)]: 1, [daysAgo(2)]: 3 };
    expect(computeDayStreak(days, now)).toBe(3);
  });

  it('grants a same-day grace: an inactive today does not break yesterday-earned streak', () => {
    const days = { [daysAgo(1)]: 1, [daysAgo(2)]: 1 };
    expect(computeDayStreak(days, now)).toBe(2);
  });

  it('breaks the streak on a gap', () => {
    const days = { [daysAgo(0)]: 1, [daysAgo(2)]: 1 }; // missing yesterday
    expect(computeDayStreak(days, now)).toBe(1);
  });

  it('is 0 with no activity', () => {
    expect(computeDayStreak({}, now)).toBe(0);
  });
});

describe('activityHeatmap', () => {
  it('produces weeks columns of 7 rows and surfaces recorded counts', () => {
    const grid = activityHeatmap({ [daysAgo(0)]: 5 }, 4, now);
    expect(grid).toHaveLength(4);
    expect(grid.every((col) => col.length === 7)).toBe(true);
    const flat = grid.flat();
    expect(flat.find((c) => c.date === daysAgo(0))?.count).toBe(5);
  });
});

describe('activityTotals', () => {
  it('counts active days and total events', () => {
    expect(activityTotals({ a: 3, b: 1 })).toEqual({ activeDays: 2, totalEvents: 4 });
  });
});
