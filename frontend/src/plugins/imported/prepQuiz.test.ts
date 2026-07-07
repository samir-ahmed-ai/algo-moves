import { describe, expect, it } from 'vitest';
import { defaultPrepQuiz } from './prepQuiz';
import { quizCorrectnessIssues } from '@/lib/quiz';
import type { PrepProblem } from './prepTypes';

const emptyPattern: PrepProblem = {
  id: 'prep-test-empty-pattern',
  topic: 'arrays',
  topicTitle: 'Arrays',
  course: 'Prep',
  courseIcon: 'Table',
  slug: 'empty-pattern',
  number: '0',
  title: 'Empty pattern probe',
  difficulty: 'Easy',
  tags: [],
  pattern: '',
  visual: 'Walk the array once',
  memorize: 'n/a',
  scene: '',
  acquired: '',
  time: 'O(n)',
  space: 'O(1)',
  code: '',
  notes: '',
  approaches: '',
  variants: [],
};

describe('defaultPrepQuiz', () => {
  it('skips pattern question when pattern is empty', () => {
    const qs = defaultPrepQuiz(emptyPattern, [emptyPattern]);
    expect(qs.some((q) => q.id.endsWith(':pattern'))).toBe(false);
    expect(qs.some((q) => q.id.endsWith(':time'))).toBe(true);
  });

  it('generated questions pass quizCorrectnessIssues', () => {
    for (const q of defaultPrepQuiz(emptyPattern, [emptyPattern])) {
      expect(quizCorrectnessIssues(q)).toEqual([]);
    }
  });
});
