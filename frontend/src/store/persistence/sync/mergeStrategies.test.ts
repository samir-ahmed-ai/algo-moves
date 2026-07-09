import { describe, expect, it } from 'vitest';
import type { ProblemStat, ProgressData } from '@/store/persistence/progress';
import type { SrsCard, SrsData } from '@/store/persistence/srs';
import { mergeProgress, mergeSrs, mergeSrsCard, mergeStat } from './mergeStrategies';

function stat(p: Partial<ProblemStat>): ProblemStat {
  return { attempts: 0, correct: 0, streak: 0, bestStreak: 0, mastered: false, ...p };
}

function card(p: Partial<SrsCard>): SrsCard {
  return { problemId: 'x', due: 0, intervalDays: 0, reps: 0, ...p };
}

describe('mergeStat', () => {
  it('is field-wise monotonic; streak follows the later attempt', () => {
    const a = stat({ attempts: 3, correct: 2, streak: 1, bestStreak: 2, lastAttemptAt: 1000 });
    const b = stat({
      attempts: 2,
      correct: 1,
      streak: 5,
      bestStreak: 1,
      mastered: true,
      lastAttemptAt: 2000,
    });
    expect(mergeStat(a, b)).toEqual({
      attempts: 3, // greatest
      correct: 2, // min(max(2,1), attempts)
      streak: 5, // b has later lastAttemptAt
      bestStreak: 2, // greatest
      mastered: true, // latches
      lastAttemptAt: 2000, // max
    });
  });

  it('clamps correct to attempts and never un-masters', () => {
    const a = stat({ attempts: 5, correct: 5, mastered: true });
    const b = stat({ attempts: 1, correct: 1, mastered: false });
    const m = mergeStat(a, b);
    expect(m.correct).toBeLessThanOrEqual(m.attempts);
    expect(m.mastered).toBe(true);
  });
});

describe('mergeProgress', () => {
  it('merges shared stats, adds remote-only stats, and preserves local mistakes', () => {
    const local: ProgressData = {
      stats: { x: stat({ attempts: 2, bestStreak: 1 }) },
      mistakes: [
        { id: 'm0', problemId: 'x', problemTitle: 'X', prompt: 'p', picked: 'a', answer: 'b' },
      ],
    };
    const remote: ProgressData = {
      stats: { x: stat({ attempts: 5, bestStreak: 3 }), y: stat({ attempts: 1 }) },
      mistakes: [],
    };
    const m = mergeProgress(local, remote);
    expect(m.stats.x?.attempts).toBe(5);
    expect(m.stats.x?.bestStreak).toBe(3);
    expect(m.stats.y?.attempts).toBe(1);
    expect(m.mistakes).toHaveLength(1); // local mistake kept (remote returns none)
  });
});

describe('mergeSrsCard', () => {
  it('higher reps wins', () => {
    expect(mergeSrsCard(card({ reps: 1, due: 100 }), card({ reps: 3, due: 50 })).reps).toBe(3);
    expect(mergeSrsCard(card({ reps: 3, due: 100 }), card({ reps: 1, due: 999 })).reps).toBe(3);
  });

  it('tie on reps → later due', () => {
    expect(mergeSrsCard(card({ reps: 2, due: 100 }), card({ reps: 2, due: 200 })).due).toBe(200);
    expect(mergeSrsCard(card({ reps: 2, due: 300 }), card({ reps: 2, due: 200 })).due).toBe(300);
  });
});

describe('mergeSrs', () => {
  it('unions cards, merging shared ids', () => {
    const local: SrsData = { cards: { x: card({ problemId: 'x', reps: 1, due: 10 }) } };
    const remote: SrsData = {
      cards: {
        x: card({ problemId: 'x', reps: 4, due: 5 }),
        y: card({ problemId: 'y', reps: 2, due: 99 }),
      },
    };
    const m = mergeSrs(local, remote);
    expect(m.cards.x?.reps).toBe(4);
    expect(m.cards.y?.reps).toBe(2);
  });
});
