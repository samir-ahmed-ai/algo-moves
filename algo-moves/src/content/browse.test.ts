import { describe, expect, it } from 'vitest';
import { catalog } from './index';
import { getItemsForCategory, browseBreadcrumbForItem, categoryIdForItem } from './browse';

describe('content/browse', () => {
  it('getItemsForCategory dedupes and sorts by title', () => {
    const items = getItemsForCategory('arrays', catalog);
    expect(items.length).toBeGreaterThan(0);
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const titles = items.map((i) => i.title);
    expect([...titles].sort((a, b) => a.localeCompare(b))).toEqual(titles);
    expect(items.every((i) => i.pluginId)).toBe(true);
  });

  it('returns empty list for unknown category', () => {
    expect(getItemsForCategory('not-a-category', catalog)).toEqual([]);
  });

  it('browseBreadcrumbForItem resolves track and category', () => {
    const sample = getItemsForCategory('arrays', catalog)[0];
    expect(sample).toBeDefined();
    const crumb = browseBreadcrumbForItem(sample!.id, catalog);
    expect(crumb.item?.id).toBe(sample!.id);
    expect(crumb.category?.id).toBe('arrays');
    expect(crumb.track).toBeDefined();
  });

  it('categoryIdForItem is stable for indexed items', () => {
    const sample = getItemsForCategory('strings', catalog)[0];
    expect(sample).toBeDefined();
    expect(categoryIdForItem(sample!.id, catalog)).toBe('strings');
  });
});
