import { describe, expect, it } from 'vitest';
import { flattenSearchSections, mergeSearchSections, type SearchHit } from '@/lib/search';

describe('omnibar section merge', () => {
  it('orders sections for keyboard navigation', () => {
    const client: SearchHit[] = [
      { kind: 'problem', id: 'two-sum', title: 'Two Sum', score: 10 },
      { kind: 'action', id: 'mode:play', title: 'Mode: Play', score: 4 },
      { kind: 'game', id: 'tic-tac-toe', title: 'Tic Tac Toe', score: 3 },
    ];
    const server: SearchHit[] = [
      { kind: 'plan', id: 'p1', title: 'Comcast', score: 0.8 },
      { kind: 'resume', id: 'r1', title: 'My Resume', score: 0.5 },
    ];
    const sections = mergeSearchSections(client, server, { query: 'c' });
    expect(sections.map((s) => s.id)).toEqual(['problems', 'plans', 'resumes', 'games', 'actions']);
    expect(flattenSearchSections(sections).map((h) => h.id)).toEqual([
      'two-sum',
      'p1',
      'r1',
      'tic-tac-toe',
      'mode:play',
    ]);
  });
});
