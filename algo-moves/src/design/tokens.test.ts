import { describe, expect, it } from 'vitest';
import {
  NODE_UI_SCALE,
  STRUDEL_NODE_W,
  vizText,
  vizPad,
  FIT_VIEW_DURATION_MS,
  MIN_VIEWPORT_HEIGHT,
  CANVAS_MARGIN,
} from './tokens';

describe('design/tokens', () => {
  it('re-exports canvas, node, and viz tokens', () => {
    expect(STRUDEL_NODE_W).toBe(400);
    expect(NODE_UI_SCALE).toBe(1.25);
    expect(FIT_VIEW_DURATION_MS).toBe(400);
    expect(MIN_VIEWPORT_HEIGHT).toBe(280);
    expect(CANVAS_MARGIN).toBe(12);
    expect(vizText.base).toContain('--node-fs');
    expect(vizPad).toContain('--node-px');
  });
});
