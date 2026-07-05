import { describe, expect, it } from 'vitest';
import { buildQuizAnswerOp, isQuizOp, toHostQuizEntry } from './quizProtocol';

describe('quizProtocol', () => {
  it('builds and parses quiz answer ops', () => {
    const op = buildQuizAnswerOp('p1', 'q0', 'O(n)', true);
    expect(isQuizOp(op)).toBe(true);
    expect(isQuizOp({ __quiz: 'nope' })).toBe(false);
    const entry = toHostQuizEntry(op, 'peer-1', 'Alex');
    expect(entry.peerName).toBe('Alex');
    expect(entry.correct).toBe(true);
  });
});
