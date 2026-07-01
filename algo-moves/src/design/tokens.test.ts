import { describe, expect, it } from 'vitest';
import {
  EXAMPLES_MIN_H,
  NODE_UI_SCALE,
  PROBLEM_MIN_H,
  spacing,
  STRUDEL_NODE_W,
  vizText,
  vizPad,
  FIT_VIEW_DURATION_MS,
  MIN_VIEWPORT_HEIGHT,
  CANVAS_MARGIN,
} from './tokens';

describe('design/tokens', () => {
  it('spacing returns CSS var references for scale 1–6', () => {
    expect(spacing(1)).toBe('var(--space-1)');
    expect(spacing(3)).toBe('var(--space-3)');
    expect(spacing(6)).toBe('var(--space-6)');
  });

  it('re-exports canvas, node, and viz tokens', () => {
    expect(STRUDEL_NODE_W).toBe(400);
    expect(NODE_UI_SCALE).toBe(1.25);
    expect(PROBLEM_MIN_H).toBe(188);
    expect(EXAMPLES_MIN_H).toBe(113);
    expect(FIT_VIEW_DURATION_MS).toBe(400);
    expect(MIN_VIEWPORT_HEIGHT).toBe(280);
    expect(CANVAS_MARGIN).toBe(12);
    expect(vizText.base).toContain('--node-fs');
    expect(vizPad).toContain('--node-px');
  });
});
