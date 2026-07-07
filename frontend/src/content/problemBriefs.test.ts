import { describe, expect, it } from 'vitest';
import {
  catalog,
  getCategoryById,
  getItemsForCategory,
  getAllCategories,
  briefFor,
  statementsFor,
} from './index';

const CATEGORY_DESCRIPTIONS = new Set(
  getAllCategories()
    .map((c) => c.description ?? c.summary ?? '')
    .filter((text) => text.length > 0),
);

function catalogProblems() {
  return catalog.items.filter((item) => item.kind === 'problem' && item.pluginId);
}

describe('briefFor — full catalog', () => {
  it('every catalog problem has two statements and at least one example case', () => {
    const items = catalogProblems();
    expect(items.length).toBeGreaterThan(100);

    for (const item of items) {
      const brief = briefFor(item, []);
      expect(brief.statements.length, item.id).toBe(2);
      expect(brief.statements[0]!.trim().length, item.id).toBeGreaterThan(10);
      expect(brief.statements[1]!.trim().length, item.id).toBeGreaterThan(10);
      expect(brief.statements[0], item.id).not.toBe(brief.statements[1]);
      expect(brief.cases.length, item.id).toBeGreaterThanOrEqual(1);

      for (const text of brief.statements) {
        expect(CATEGORY_DESCRIPTIONS.has(text), `${item.id} repeats category blurb`).toBe(false);
      }
    }
  });

  it('prefers two example cases when the plugin has multiple inputs', () => {
    const withTwoInputs = catalogProblems().filter((item) => {
      const brief = briefFor(item, []);
      return brief.cases.length >= 2;
    });
    expect(withTwoInputs.length).toBeGreaterThan(50);
  });
});

describe('statementsFor — spot checks', () => {
  it('max product of subarray uses prep-specific copy', () => {
    const item = catalog.getItem('prep-arrays-max-product-of-subarray');
    expect(item).toBeDefined();
    const [a, b] = statementsFor(item!);
    expect(a).toMatch(/product/i);
    expect(b).toMatch(/max and min|negative/i);
  });

  it('linked-list cycle override keeps Floyd insight', () => {
    const item = catalog.getItem('linked-list-cycle');
    expect(item).toBeDefined();
    const [a, b] = statementsFor(item!);
    expect(a).toMatch(/cycle/i);
    expect(b).toMatch(/fast and slow|pointers/i);
  });

  it('climbing stairs uses DP-specific copy', () => {
    const item = catalog.getItem('climbing-stairs');
    expect(item).toBeDefined();
    const brief = briefFor(item!, []);
    expect(brief.statements[0]).toMatch(/stairs|ways/i);
    expect(brief.statements[1]).toMatch(/dp|previous two/i);
    expect(brief.cases.length).toBeGreaterThanOrEqual(1);
  });

  it('number of islands uses graph-specific copy with example output', () => {
    const item = catalog.getItem('number-of-islands');
    expect(item).toBeDefined();
    const brief = briefFor(item!, []);
    expect(brief.statements[0]!.length).toBeGreaterThan(10);
    expect(brief.statements[1]).toMatch(/grid|island|visit|connected|dfs|flood/i);
    expect(brief.cases.some((c) => c.output)).toBe(true);
  });

  it('subsets uses backtracking copy with two examples', () => {
    const item = catalog.getItem('subsets');
    expect(item).toBeDefined();
    const brief = briefFor(item!, []);
    expect(brief.statements[0]).toMatch(/subset/i);
    expect(brief.statements[1]).toMatch(/backtrack|branch|include|skip/i);
    expect(brief.cases.length).toBeGreaterThanOrEqual(2);
  });

  it('binary search override includes expected output on cases', () => {
    const item = catalog.getItem('binary-search');
    expect(item).toBeDefined();
    const brief = briefFor(item!, []);
    expect(brief.statements[0]).toMatch(/sorted|target|index/i);
    expect(brief.cases.length).toBeGreaterThanOrEqual(1);
  });
});

describe('statementsFor — priority categories', () => {
  const TARGET_CATEGORIES = [
    'arrays',
    'dynamic-programming',
    'graphs',
    'backtracking',
    'binary-search',
  ] as const;

  for (const categoryId of TARGET_CATEGORIES) {
    it(`returns problem-specific statements for every item in ${categoryId}`, () => {
      const category = getCategoryById(categoryId);
      const categoryText = category?.description ?? category?.summary ?? '';
      const items = getItemsForCategory(categoryId, catalog);

      expect(items.length).toBeGreaterThan(0);

      for (const item of items) {
        const [a, b] = statementsFor(item);
        expect(a.trim().length, item.id).toBeGreaterThan(10);
        expect(b.trim().length, item.id).toBeGreaterThan(10);
        expect(a, item.id).not.toBe(b);

        if (categoryText) {
          expect(a, item.id).not.toBe(categoryText);
          expect(b, item.id).not.toBe(categoryText);
        }
      }
    });
  }
});
