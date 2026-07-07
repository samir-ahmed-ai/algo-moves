import { describe, expect, it } from 'vitest';
import {
  isCodeHeadline,
  isComplexityHeadline,
  parseQuizChoiceLabel,
  quizLabelIssues,
} from './quizChoiceFormat';

describe('parseQuizChoiceLabel', () => {
  it('splits headline and detail on em dash', () => {
    expect(parseQuizChoiceLabel('O(n!) — branching narrows each deeper row')).toEqual({
      headline: 'O(n!)',
      detail: 'branching narrows each deeper row',
    });
  });

  it('does not split formulas with spaced minus', () => {
    expect(parseQuizChoiceLabel('(i - 1) / 2')).toEqual({ headline: '(i - 1) / 2' });
  });

  it('splits when detail follows formula headline', () => {
    expect(parseQuizChoiceLabel('(i - 1) / 2 — parent index formula')).toEqual({
      headline: '(i - 1) / 2',
      detail: 'parent index formula',
    });
  });
});

describe('isComplexityHeadline', () => {
  it('detects Big-O', () => {
    expect(isComplexityHeadline('O(n log n)')).toBe(true);
    expect(isComplexityHeadline('Backtracking')).toBe(false);
  });
});

describe('isCodeHeadline', () => {
  it('detects code-like headlines', () => {
    expect(isCodeHeadline('left++')).toBe(true);
    expect(isCodeHeadline('O(n)')).toBe(false);
  });
});

describe('quizLabelIssues', () => {
  it('accepts headline — detail labels', () => {
    expect(quizLabelIssues('O(n!) — branching narrows each deeper row')).toBeNull();
  });

  it('rejects missing detail', () => {
    expect(quizLabelIssues('O(n) time, O(1) space')?.reason).toMatch(/missing detail/);
  });

  it('rejects generic filler and comma-split headlines', () => {
    expect(quizLabelIssues('Backtracking — plausible distractor')?.reason).toMatch(/generic/);
    expect(quizLabelIssues('n=0 and n=1 have — the same answer')?.reason).toMatch(/comma-split/);
    expect(quizLabelIssues('Greedy pick — wrong approach here')?.reason).toMatch(/generic/);
    expect(quizLabelIssues('To visit nodes in, — lexicographic order')?.reason).toMatch(
      /comma-split/,
    );
    expect(quizLabelIssues('`adj[pre]` appends `course`… — edge to prerequisite')?.reason).toMatch(
      /truncated/,
    );
  });
});
