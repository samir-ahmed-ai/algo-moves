import { describe, expect, it } from 'vitest';
import { NODE_W, STRUDEL_NODE_W } from '../nodes/nodeTokens';
import {
  CANVAS_NODE_SEP,
  VIZ_WIRE_GAP,
  canvasNodeSep,
  handlePortOffset,
  scaleFromNodeWidth,
  vizMinWidth,
  vizWireGap,
} from './canvasTokens';

describe('canvasTokens', () => {
  it('scales spacing from node width', () => {
    expect(canvasNodeSep(400)).toBe(24);
    expect(vizWireGap(400)).toBe(100);
    expect(vizWireGap(400, 'theater')).toBe(85);
    expect(handlePortOffset(400)).toBe(10);
    expect(vizMinWidth(400)).toBe(400);
  });

  it('exports defaults aligned with NODE_W', () => {
    expect(STRUDEL_NODE_W).toBe(NODE_W);
    expect(CANVAS_NODE_SEP).toBe(canvasNodeSep(NODE_W));
    expect(VIZ_WIRE_GAP).toBe(vizWireGap(NODE_W));
  });

  it('respects scale floors', () => {
    expect(scaleFromNodeWidth(100, 0.25, 80)).toBe(80);
    expect(vizWireGap(200, 'theater')).toBeGreaterThanOrEqual(64);
  });
});
