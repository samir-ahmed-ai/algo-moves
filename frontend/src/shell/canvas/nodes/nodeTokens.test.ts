import { describe, expect, it } from 'vitest';
import {
  layoutEstimate,
  LEGACY_STRUDEL_NODE_W,
  NODE_MAX_W,
  NODE_UI_SCALE,
  layoutFixedWidth,
  STRUDEL_NODE_W,
} from './nodeTokens';

describe('nodeTokens', () => {
  it('NODE_UI_SCALE matches Strudel width bump over legacy w-80', () => {
    expect(NODE_UI_SCALE).toBe(STRUDEL_NODE_W / LEGACY_STRUDEL_NODE_W);
    expect(NODE_UI_SCALE).toBe(1.25);
  });

  it('scales narrow panel layout estimates', () => {
    expect(layoutEstimate('problem').estH).toBe(Math.round(380 * NODE_UI_SCALE));
  });

  it('caps problem resize at NODE_MAX_W', () => {
    expect(NODE_MAX_W).toBe(600);
    expect(layoutFixedWidth('problem')).toBe(NODE_MAX_W);
    expect(layoutEstimate('problem').cap).toBe(NODE_MAX_W);
  });
});
