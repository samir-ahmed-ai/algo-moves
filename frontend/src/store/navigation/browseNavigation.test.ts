import { describe, it, expect } from 'vitest';
import { catalog } from '@/content';
import { initialBrowseFromHash } from './browseNavigation';

describe('initialBrowseFromHash', () => {
  it('returns empty browse state for desktop hashes', () => {
    expect(initialBrowseFromHash('#home')).toEqual({
      trackId: null,
      categoryId: null,
      topicId: null,
    });
  });

  it('hydrates track and category from mobile pathname hash', () => {
    expect(
      initialBrowseFromHash('#track/data-structures/category/prep-arrays-all', null, '/mobile'),
    ).toEqual({
      trackId: 'data-structures',
      categoryId: 'prep-arrays-all',
      topicId: null,
    });
  });

  it('hydrates legacy browse topic id from mobile hash', () => {
    expect(initialBrowseFromHash('#topic/browse-prep-arrays-all', null, '/mobile')).toEqual({
      trackId: null,
      categoryId: 'prep-arrays-all',
      topicId: 'browse-prep-arrays-all',
    });
  });

  it('ignores mobile hash when a shared item link is present', () => {
    const sharedItem = catalog.firstItemId;
    expect(
      initialBrowseFromHash(
        '#track/data-structures/category/prep-arrays-all',
        sharedItem,
        '/mobile',
      ),
    ).toEqual({
      trackId: null,
      categoryId: null,
      topicId: null,
    });
  });
});
