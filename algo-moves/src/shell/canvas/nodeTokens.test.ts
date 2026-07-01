import { describe, expect, it } from 'vitest';
import {
  EXAMPLES_MIN_H,
  layoutEstimate,
  LEGACY_STRUDEL_NODE_W,
  NODE_UI_SCALE,
  panelMinHeight,
  PROBLEM_MIN_H,
  STRUDEL_NODE_W,
} from './nodeTokens';

describe('nodeTokens', () => {
  it('NODE_UI_SCALE matches Strudel width bump over legacy w-80', () => {
    expect(NODE_UI_SCALE).toBe(STRUDEL_NODE_W / LEGACY_STRUDEL_NODE_W);
    expect(NODE_UI_SCALE).toBe(1.25);
  });

  it('scales narrow panel min heights and estimates', () => {
    expect(PROBLEM_MIN_H).toBe(Math.round(150 * NODE_UI_SCALE));
    expect(EXAMPLES_MIN_H).toBe(Math.round(90 * NODE_UI_SCALE));
    expect(layoutEstimate('problem').estH).toBe(Math.round(275 * NODE_UI_SCALE));
    expect(layoutEstimate('examples').estH).toBe(Math.round(150 * NODE_UI_SCALE));
  });

  it('panelMinHeight returns kind-specific floors', () => {
    expect(panelMinHeight('problem')).toBe(PROBLEM_MIN_H);
    expect(panelMinHeight('examples')).toBe(EXAMPLES_MIN_H);
    expect(panelMinHeight('viz')).toBe(PROBLEM_MIN_H);
  });
});
