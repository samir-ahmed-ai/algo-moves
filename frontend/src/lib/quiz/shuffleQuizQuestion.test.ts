import { describe, expect, it } from 'vitest';
import { quizQuestionSeed, shuffleQuizQuestion } from './shuffleQuizQuestion';

const q = {
  id: 't',
  prompt: 'p',
  explain: 'e',
  choices: [{ label: 'A', correct: true }, { label: 'B' }, { label: 'C' }, { label: 'D' }],
};

describe('shuffleQuizQuestion', () => {
  it('preserves all choices and correct flag', () => {
    const shuffled = shuffleQuizQuestion(q, 42);
    expect(shuffled.choices).toHaveLength(4);
    expect(shuffled.choices.filter((c) => c.correct)).toHaveLength(1);
    expect(shuffled.choices.find((c) => c.correct)?.label).toBe('A');
  });

  it('reorders with a fixed seed', () => {
    const a = shuffleQuizQuestion(q, 99).choices.map((c) => c.label);
    const b = shuffleQuizQuestion(q, 99).choices.map((c) => c.label);
    expect(a).toEqual(b);
    expect(a.join('')).not.toBe('ABCD');
  });

  it('quizQuestionSeed varies by run, question, and attempt', () => {
    expect(quizQuestionSeed(1000, 1, 0)).not.toBe(quizQuestionSeed(2000, 1, 0));
    expect(quizQuestionSeed(1000, 1, 0)).not.toBe(quizQuestionSeed(1000, 2, 0));
    expect(quizQuestionSeed(1000, 1, 0)).not.toBe(quizQuestionSeed(1000, 1, 1));
  });

  it('can skip shuffling when disabled', () => {
    const ordered = shuffleQuizQuestion(q, 99, false).choices.map((c) => c.label);
    expect(ordered).toEqual(['A', 'B', 'C', 'D']);
  });
});
