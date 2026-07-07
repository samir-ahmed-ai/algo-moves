import { describe, expect, it } from 'vitest';
import { initialQuizState, quizReducer, quizAccuracy } from './quizReducer';

describe('quizReducer', () => {
  const total = 3;

  it('starts unanswered', () => {
    const s = initialQuizState();
    expect(s.picked).toBeNull();
    expect(s.done).toBe(false);
  });

  it('records a correct pick', () => {
    const s = quizReducer(initialQuizState(), { type: 'PICK', index: 1, correct: true }, total);
    expect(s.picked).toBe(1);
    expect(s.score).toBe(1);
  });

  it('advances to next question', () => {
    let s = quizReducer(initialQuizState(), { type: 'PICK', index: 0, correct: true }, total);
    s = quizReducer(s, { type: 'NEXT' }, total);
    expect(s.index).toBe(1);
    expect(s.picked).toBeNull();
  });

  it('finishes on last question', () => {
    let s = { ...initialQuizState(), index: 2 };
    s = quizReducer(s, { type: 'PICK', index: 0, correct: false }, total);
    s = quizReducer(s, { type: 'NEXT' }, total);
    expect(s.done).toBe(true);
  });

  it('restarts a run', () => {
    let s = quizReducer(initialQuizState(), { type: 'PICK', index: 0, correct: true }, total);
    s = quizReducer(s, { type: 'RESTART', seed: 42 }, total);
    expect(s).toEqual({ index: 0, picked: null, score: 0, done: false, shuffleSeed: 42 });
  });

  it('computes accuracy', () => {
    expect(quizAccuracy(2, 4)).toBe(50);
    expect(quizAccuracy(0, 0)).toBe(0);
  });
});
