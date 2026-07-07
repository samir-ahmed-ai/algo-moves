import { describe, expect, it } from 'vitest';
import { buildShuffledChoices } from './buildShuffledChoices';
import { shuffleSeeded } from './shuffleSeeded';

const POOL = ['O(1)', 'O(n)', 'O(n^2)', 'O(log n)', 'O(n log n)'];
const ANSWER = 'O(n)';

describe('buildShuffledChoices', () => {
  it('is byte-identical to the original inline formula', () => {
    for (const round of [0, 1, 2, 7]) {
      const inline = shuffleSeeded(
        [
          ANSWER,
          ...shuffleSeeded(
            POOL.filter((p) => p !== ANSWER),
            round,
          ).slice(0, 3),
        ],
        round + 1,
      );
      expect(buildShuffledChoices(ANSWER, POOL, round)).toEqual(inline);
    }
  });

  it('always includes the answer and no duplicate of it', () => {
    const choices = buildShuffledChoices(ANSWER, POOL, 3);
    expect(choices).toContain(ANSWER);
    expect(choices.filter((c) => c === ANSWER)).toHaveLength(1);
  });

  it('returns answer + distractors, all drawn from the pool', () => {
    const choices = buildShuffledChoices(ANSWER, POOL, 0, 3);
    expect(choices).toHaveLength(4);
    for (const c of choices) expect(POOL).toContain(c);
  });

  it('is deterministic within a round and varies across rounds', () => {
    expect(buildShuffledChoices(ANSWER, POOL, 5)).toEqual(buildShuffledChoices(ANSWER, POOL, 5));
    expect(buildShuffledChoices(ANSWER, POOL, 0)).not.toEqual(
      buildShuffledChoices(ANSWER, POOL, 1),
    );
  });
});
