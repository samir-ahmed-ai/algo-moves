import { describe, expect, it } from 'vitest';
import type { QuizQuestion } from '@/core/types';
import { correctIndex, drawQuestions, scoreCheckpoint } from './checkpoint';

const q = (id: string, correctAt: number): QuizQuestion => ({
  id,
  prompt: id,
  explain: 'x',
  choices: [0, 1, 2].map((i) => ({
    label: `c${i}`,
    ...(i === correctAt ? { correct: true } : {}),
  })),
});

const QS = [q('a', 0), q('b', 1), q('c', 2), q('d', 0), q('e', 1)];

describe('scoreCheckpoint', () => {
  it('counts every answer and passes at threshold', () => {
    const answers = [0, 1, 2, 0, 1]; // all correct
    expect(scoreCheckpoint(QS, answers, 80)).toEqual({
      correct: 5,
      total: 5,
      pct: 100,
      passed: true,
    });
  });

  it('fails below threshold and treats unanswered as wrong', () => {
    const answers = [0, 1, null, 9, 9]; // 2/5 correct
    const r = scoreCheckpoint(QS, answers, 80);
    expect(r.correct).toBe(2);
    expect(r.pct).toBe(40);
    expect(r.passed).toBe(false);
  });

  it('passes exactly at the boundary', () => {
    const answers = [0, 1, 2, 0, 9]; // 4/5 = 80%
    expect(scoreCheckpoint(QS, answers, 80).passed).toBe(true);
  });
});

describe('drawQuestions', () => {
  it('returns all when no draw count', () => {
    expect(drawQuestions(QS)).toHaveLength(5);
  });
  it('samples the first N', () => {
    expect(drawQuestions(QS, 3)).toHaveLength(3);
  });
});

describe('correctIndex', () => {
  it('finds the correct choice', () => {
    expect(correctIndex(q('z', 2))).toBe(2);
  });
});
