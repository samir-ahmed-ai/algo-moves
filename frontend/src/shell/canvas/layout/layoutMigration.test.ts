import { describe, expect, it } from 'vitest';
import type { LayoutEntry } from '@/store/canvas-layout';
import {
  migrateLayouts,
  migrateVisualizeLayoutEntry,
  migrateCodeLayoutEntry,
} from './layoutMigration';

const pos = { x: 0, y: 0 };

describe('migrateCodeLayoutEntry', () => {
  it('folds a legacy scratch node into code and marks scratch removed', () => {
    const entry: LayoutEntry = {
      nodes: { code: { position: pos, width: 300 }, scratch: { position: pos, width: 500 } },
      removed: [],
    };
    const out = migrateCodeLayoutEntry(entry);
    expect(out.nodes.scratch).toBeUndefined();
    expect(out.nodes.code!.width).toBe(500); // widened to the larger of the two
    expect(out.removed).toContain('scratch');
  });

  it('is a no-op when there is no scratch node', () => {
    const entry: LayoutEntry = { nodes: { code: { position: pos } }, removed: [] };
    expect(migrateCodeLayoutEntry(entry)).toBe(entry);
  });
});

describe('migrateVisualizeLayoutEntry', () => {
  it('merges a legacy inspector width into viz and folds into workbench', () => {
    const entry: LayoutEntry = {
      nodes: { viz: { position: pos, width: 680 }, inspector: { position: pos, width: 400 } },
      removed: [],
    };
    const out = migrateVisualizeLayoutEntry(entry);
    expect(out.nodes.inspector).toBeUndefined();
    expect(out.nodes.viz).toBeUndefined();
    expect(out.nodes.workbench?.width).toBe(1080);
    expect(out.removed).toContain('inspector');
    expect(out.removed).toContain('viz');
  });

  it('renames a legacy examples node to problem and retires examples', () => {
    const entry: LayoutEntry = { nodes: { examples: { position: pos } }, removed: [] };
    const out = migrateVisualizeLayoutEntry(entry);
    expect(out.nodes.problem).toBeUndefined();
    expect(out.nodes.workbench).toBeDefined();
    expect(out.nodes.examples).toBeUndefined();
    expect(out.removed).toContain('examples');
    expect(out.removed).toContain('problem');
  });

  it('folds legacy problem + viz + code into workbench', () => {
    const entry: LayoutEntry = {
      nodes: {
        problem: { position: { x: 0, y: 10 }, width: 400 },
        viz: { position: { x: 420, y: 0 }, width: 720 },
        code: { position: { x: 1160, y: 0 }, width: 500 },
      },
      removed: [],
    };
    const out = migrateVisualizeLayoutEntry(entry);
    expect(out.nodes.workbench).toEqual({
      position: { x: 0, y: 10 },
      width: 1620,
    });
    expect(out.nodes.problem).toBeUndefined();
    expect(out.nodes.viz).toBeUndefined();
    expect(out.nodes.code).toBeUndefined();
    expect(out.removed).toEqual(expect.arrayContaining(['problem', 'viz', 'code']));
  });

  it('strips deprecated shell edge ids from removedEdges', () => {
    const entry: LayoutEntry = {
      nodes: { workbench: { position: pos } },
      removed: ['problem', 'viz', 'code'],
      removedEdges: ['problem->viz', 'viz->code', 'workbench->cases'],
    };
    const out = migrateVisualizeLayoutEntry(entry);
    expect(out.removedEdges).toEqual(['workbench->cases']);
  });
});

describe('migrateLayouts', () => {
  it('collapses per-plugin practice + code keys into a single learn key', () => {
    const stored: Record<string, LayoutEntry> = {
      'two-sum:practice': { nodes: { problem: { position: pos } }, removed: [] },
      'two-sum:code': { nodes: { code: { position: pos, width: 400 } }, removed: [] },
    };
    const out = migrateLayouts(stored);
    expect(out['two-sum:learn']).toBeDefined();
    expect(out['two-sum:practice']).toBeUndefined();
    expect(out['two-sum:code']).toBeUndefined();
    const learn = out['two-sum:learn']!;
    expect(learn.nodes.problem).toBeDefined();
    expect(learn.nodes.code).toBeDefined();
  });

  it('strips persisted heights while preserving positions and widths', () => {
    const stored: Record<string, LayoutEntry> = {
      'two-sum:visualize': {
        nodes: { viz: { position: { x: 5, y: 6 }, width: 700, height: 400 } },
        removed: [],
      },
    };
    const out = migrateLayouts(stored);
    const wb = out['two-sum:visualize']!.nodes.workbench!;
    expect(wb.height).toBeUndefined();
    expect(wb.width).toBe(700);
    expect(wb.position).toEqual({ x: 5, y: 6 });
  });
});
