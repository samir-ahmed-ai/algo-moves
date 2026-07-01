import { describe, it, expect } from 'vitest';
import { catalog } from '../../content';
import { shapeFor } from '../../content/problemShape';
import { PROBLEM_GISTS, gistFor } from '../../content/gists';
import { hasBespokeScene } from './gistScenes';

const PRIORITY = ['backtracking', 'graph', 'binarySearch', 'dp'] as const;

const problems = catalog.courses
  .flatMap((c) => c.topics)
  .flatMap((t) => t.items)
  .filter((i) => i.kind === 'problem' && i.pluginId);

describe('gist', () => {
  it('every problem resolves to a concise, non-empty ask', () => {
    for (const item of problems) {
      const gist = gistFor(item);
      expect(gist.length, item.id).toBeGreaterThan(0);
      expect(gist.length, item.id).toBeLessThanOrEqual(140);
    }
  });

  it('every priority-category problem has a curated ask (not a fallback)', () => {
    const priority = problems.filter((i) => (PRIORITY as readonly string[]).includes(shapeFor(i)));
    expect(priority.length).toBeGreaterThan(60);
    for (const item of priority) {
      const curated = PROBLEM_GISTS[item.id] ?? (item.pluginId ? PROBLEM_GISTS[item.pluginId] : undefined);
      expect(curated, `missing curated gist for ${item.id}`).toBeTruthy();
      expect(curated!.length, item.id).toBeLessThanOrEqual(100);
    }
  });

  it('the priority categories all get a bespoke hero scene', () => {
    const shapes = new Set(problems.map(shapeFor));
    for (const shape of ['backtracking', 'graph', 'binarySearch', 'dp'] as const) {
      expect(shapes.has(shape), `no problems with shape ${shape}`).toBe(true);
    }
    const sample = problems.find((i) => shapeFor(i) === 'binarySearch');
    expect(sample && hasBespokeScene(sample)).toBe(true);
  });
});
