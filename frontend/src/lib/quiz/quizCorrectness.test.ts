import { describe, expect, it } from 'vitest';
import { quizCorrectnessIssues } from './quizCorrectness';
import type { QuizQuestion } from '@/core/types';

function q(overrides: Partial<QuizQuestion> & Pick<QuizQuestion, 'choices'>): QuizQuestion {
  return { id: 't', prompt: 'p?', explain: '', ...overrides };
}

describe('quizCorrectnessIssues', () => {
  it('accepts a well-formed question', () => {
    expect(
      quizCorrectnessIssues(
        q({
          choices: [
            { label: 'Hash map — fits this problem', correct: true },
            { label: 'Brute force — different approach' },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('flags missing correct choice', () => {
    expect(
      quizCorrectnessIssues(
        q({
          choices: [{ label: 'Only one — no correct flag' }, { label: 'Also none — different' }],
        }),
      ),
    ).toContain('expected 1 correct choice, got 0');
  });

  it('flags duplicate labels', () => {
    expect(
      quizCorrectnessIssues(
        q({
          choices: [
            { label: 'Same label — detail A', correct: true },
            { label: 'Same label — detail A' },
          ],
        }),
      ),
    ).toContain('duplicate choice labels');
  });
});
