import { describe, expect, it } from 'vitest';
import {
  flattenSearchSections,
  mergeSearchSections,
  parseSearchTerms,
  resetClientSearchIndex,
  scoreDocument,
  searchClient,
  type SearchDocument,
  type SearchHit,
} from './index';

describe('parseSearchTerms', () => {
  it('splits and lowercases', () => {
    expect(parseSearchTerms('  Two SUM ')).toEqual(['two', 'sum']);
  });
});

describe('scoreDocument', () => {
  const doc: SearchDocument = {
    kind: 'problem',
    id: 'two-sum',
    title: 'Two Sum',
    subtitle: 'Easy',
    keywords: ['hash-map', 'arrays', 'leetcode'],
  };

  it('returns 0 when any term fails', () => {
    expect(scoreDocument(doc, ['two', 'panel'])).toBe(0);
  });

  it('scores title prefix higher than keyword-only', () => {
    const prefix = scoreDocument(doc, ['two']);
    const keyword = scoreDocument(doc, ['hash']);
    expect(prefix).toBeGreaterThan(keyword);
  });

  it('matches compact alnum queries', () => {
    expect(scoreDocument(doc, ['twosum'])).toBeGreaterThan(0);
  });

  it('requires every term (AND)', () => {
    expect(scoreDocument(doc, ['two', 'easy'])).toBeGreaterThan(0);
    expect(scoreDocument(doc, ['two', 'zzz'])).toBe(0);
  });
});

describe('searchClient', () => {
  it('finds problems by title', () => {
    resetClientSearchIndex();
    const hits = searchClient('two sum', { kinds: ['problem'], limit: 10 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.title.toLowerCase().includes('two') || h.id.includes('two'))).toBe(
      true,
    );
  });

  it('finds glossary terms', () => {
    resetClientSearchIndex();
    const hits = searchClient('invariant', { kinds: ['glossary'], limit: 5 });
    expect(hits.some((h) => h.title.toLowerCase().includes('invariant'))).toBe(true);
  });

  it('finds games', () => {
    resetClientSearchIndex();
    const hits = searchClient('tic tac', { kinds: ['game'], limit: 5 });
    expect(hits.some((h) => h.id === 'tic-tac-toe')).toBe(true);
  });
});

describe('mergeSearchSections', () => {
  it('groups by kind with stable section order', () => {
    const client: SearchHit[] = [
      { kind: 'problem', id: 'a', title: 'A', score: 2 },
      { kind: 'glossary', id: 'g', title: 'G', score: 1 },
      { kind: 'action', id: 'mode:play', title: 'Mode: Play', score: 3 },
    ];
    const server: SearchHit[] = [{ kind: 'plan', id: 'p1', title: 'Comcast', score: 0.9 }];
    const sections = mergeSearchSections(client, server, { query: 'co' });
    expect(sections.map((s) => s.id)).toEqual(['problems', 'glossary', 'plans', 'actions']);
  });

  it('flattens for keyboard selection', () => {
    const sections = mergeSearchSections(
      [{ kind: 'problem', id: 'a', title: 'A', score: 1 }],
      [{ kind: 'plan', id: 'p', title: 'P', score: 1 }],
      { query: 'x' },
    );
    expect(flattenSearchSections(sections).map((h) => h.id)).toEqual(['a', 'p']);
  });
});
