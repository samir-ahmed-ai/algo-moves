import { describe, expect, it } from 'vitest';
import { getPluginMeta } from '@/core';
import { catalog } from '@/content';
import { hasLesson } from './lessons';
import { hasCheckpoint } from './checkpoints';
import { checkCatalogIntegrity } from './integrity';

/**
 * Live guard: the real, assembled catalog must be provably correct. Wired into
 * `npm run check:all` via `check-catalog-integrity`. A failure here means a
 * ship-blocking catalog defect (unbound plugin id, dangling/cyclic prereq, or an
 * empty browse category) — fix the content, not this test.
 */
describe('catalog integrity (live)', () => {
  it('has no integrity errors', () => {
    const errors = checkCatalogIntegrity(catalog, {
      hasPlugin: (id) => getPluginMeta(id) !== undefined,
      hasLesson,
      hasCheckpoint,
    });
    expect(errors).toEqual([]);
  });
});
