import { describe, expect, it } from 'vitest';
import {
  browseTopicId,
  categoryIdFromBrowseTopic,
  getAllCategories,
  getCategoriesForTrack,
  getCategoryById,
  getTrackById,
  getTracks,
  isBrowseTopicId,
} from './taxonomy';

describe('content/taxonomy', () => {
  it('defines four top-level tracks', () => {
    expect(getTracks().map((t) => t.id)).toEqual([
      'data-structures',
      'algorithms',
      'design',
      'interview-prep',
    ]);
  });

  it('maps browse topic ids', () => {
    expect(browseTopicId('arrays')).toBe('browse-arrays');
    expect(isBrowseTopicId('browse-arrays')).toBe(true);
    expect(categoryIdFromBrowseTopic('browse-arrays')).toBe('arrays');
    expect(categoryIdFromBrowseTopic('arrays')).toBeUndefined();
  });

  it('returns categories per track', () => {
    const ds = getCategoriesForTrack('data-structures');
    expect(ds.some((c) => c.id === 'arrays')).toBe(true);
    expect(getCategoryById('arrays')?.title).toBe('Arrays');
  });

  it('getAllCategories includes unique ids', () => {
    const ids = getAllCategories().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('interview-prep track aggregates categories from other tracks', () => {
    const prep = getTrackById('interview-prep');
    expect(prep?.categoryIds.length).toBeGreaterThan(getCategoriesForTrack('data-structures').length);
  });
});
