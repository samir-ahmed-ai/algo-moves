import { describe, expect, it } from 'vitest';
import { masteryBand, proficiency, retrievability } from './proficiency';

describe('retrievability', () => {
  it('is 1 right after review and 0.9 after one stability period', () => {
    expect(retrievability(10, 0)).toBe(1);
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 5);
  });
  it('is 0 for an unscheduled item', () => {
    expect(retrievability(0, 5)).toBe(0);
  });
});

describe('proficiency', () => {
  it('rewards fresh retention with strong accuracy', () => {
    const p = proficiency({ stability: 30, elapsedDays: 0, reps: 3, attempts: 5, correct: 5 });
    expect(p).toBeCloseTo(1, 5); // 0.6*1 + 0.4*1
    expect(masteryBand(p)).toBe('Mastered');
  });

  it('decays toward Proficient as time passes since review', () => {
    const fresh = proficiency({ stability: 10, elapsedDays: 0, reps: 3, attempts: 4, correct: 4 });
    const stale = proficiency({ stability: 10, elapsedDays: 40, reps: 3, attempts: 4, correct: 4 });
    expect(stale).toBeLessThan(fresh);
    expect(masteryBand(fresh)).toBe('Mastered');
    expect(masteryBand(stale)).not.toBe('Mastered');
  });

  it('caps below Proficient without a recall, however high the quiz accuracy', () => {
    const p = proficiency({ stability: 0, elapsedDays: 0, reps: 0, attempts: 10, correct: 10 });
    expect(p).toBeLessThan(0.75); // cannot certify retention on quizzes alone
    expect(masteryBand(p)).not.toBe('Mastered');
    expect(masteryBand(p)).not.toBe('Proficient');
  });
});
