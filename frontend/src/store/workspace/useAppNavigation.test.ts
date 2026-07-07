import { describe, expect, it } from 'vitest';
import { catalog, getItemsForCategory } from '@/content';
import { resolveBackToBrowseTarget } from './useAppNavigation';

describe('resolveBackToBrowseTarget', () => {
  const sample = getItemsForCategory('arrays', catalog)[0]!;

  it('keeps existing browse context when already set', () => {
    expect(resolveBackToBrowseTarget(sample.id, 'data-structures', 'arrays')).toEqual({
      trackId: 'data-structures',
      categoryId: 'arrays',
      fallback: null,
    });
  });

  it('derives browse context from the active item when browse state is empty', () => {
    const target = resolveBackToBrowseTarget(sample.id, null, null);
    expect(target.fallback).toBeNull();
    expect(target.categoryId).toBe('arrays');
    expect(target.trackId).toBeDefined();
  });

  it('falls back to home when the item has no browse path', () => {
    expect(
      resolveBackToBrowseTarget('not-in-catalog', null, null),
    ).toEqual({
      trackId: null,
      categoryId: null,
      fallback: 'home',
    });
  });
});
