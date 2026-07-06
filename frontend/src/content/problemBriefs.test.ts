import { describe, expect, it } from 'vitest';
import { catalog, getCategoryById, getItemsForCategory, statementsFor } from './index';

const TARGET_CATEGORIES = [
  'arrays',
  'dynamic-programming',
  'graphs',
  'backtracking',
  'binary-search',
] as const;

describe('statementsFor', () => {
  for (const categoryId of TARGET_CATEGORIES) {
    it(`returns two problem-specific statements for every item in ${categoryId}`, () => {
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

  it('max product of subarray uses prep-specific copy', () => {
    const item = catalog.getItem('prep-arrays-max-product-of-subarray');
    expect(item).toBeDefined();
    const [a, b] = statementsFor(item!);
    expect(a).toMatch(/product/i);
    expect(b).toMatch(/max and min|negative/i);
  });
});
