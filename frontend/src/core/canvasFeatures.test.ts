import { describe, expect, it } from 'vitest';
import { panelsConfig, modeBuiltins, panelTitle, getPanelConfig } from '../core/panelRegistry';
import { applyEffect, fastEffect, reverseEffect, maskEffect } from '../effects/registry';
import { encodeProjectState, decodeProjectState } from '@/store/project-state';
import type { Frame } from '../core/types';
import { normalizeCanvasMode } from '../core/types';

const sampleFrames = (): Frame[] =>
  [0, 1, 2, 3, 4].map((i) => ({
    move: { type: 'STEP', note: `n${i}`, caption: `Step ${i}` },
    state: { i },
  }));

describe('normalizeCanvasMode', () => {
  it('defaults missing or unknown modes to play', () => {
    expect(normalizeCanvasMode()).toBe('play');
    expect(normalizeCanvasMode('')).toBe('play');
    expect(normalizeCanvasMode('unknown')).toBe('play');
  });

  it('preserves explicit modes', () => {
    expect(normalizeCanvasMode('play')).toBe('play');
    expect(normalizeCanvasMode('visualize')).toBe('visualize');
    expect(normalizeCanvasMode('learn')).toBe('learn');
    expect(normalizeCanvasMode('practice')).toBe('learn');
  });
});

describe('panelRegistry', () => {
  it('has entries for core visualize panels', () => {
    expect(getPanelConfig('workbench')).toBeDefined();
    expect(panelTitle('workbench')).toBe('Workbench');
  });

  it('visualize mode has no built-in panels (freeform canvas)', () => {
    const builtins = modeBuiltins('visualize');
    expect(builtins).not.toContain('workbench');
    expect(builtins).toHaveLength(0);
  });

  it('workbench is optional in visualize mode', () => {
    const optional = panelsConfig.filter((p) => p.modes.includes('visualize') && p.optional);
    expect(optional.some((p) => p.id === 'workbench')).toBe(true);
  });

  it('every config entry has id and title', () => {
    for (const p of panelsConfig) {
      expect(p.id).toBeTruthy();
      expect(p.title).toBeTruthy();
    }
  });
});

describe('effect transforms', () => {
  it('fast samples frames', () => {
    const out = fastEffect.transformFrames(sampleFrames(), { factor: 2 });
    expect(out.length).toBeLessThan(sampleFrames().length);
    expect(out[0].move.note).toBe('n0');
  });

  it('reverse reverses order', () => {
    const out = reverseEffect.transformFrames(sampleFrames(), { enabled: true });
    expect(out[0].move.note).toBe('n4');
  });

  it('mask keeps first and last', () => {
    const out = maskEffect.transformFrames(sampleFrames(), { probability: 0, seed: 1 });
    expect(out.length).toBeGreaterThanOrEqual(2);
  });

  it('applyEffect dispatches by id', () => {
    const out = applyEffect('reverse', sampleFrames(), { enabled: true });
    expect(out[0].move.note).toBe('n4');
  });
});

describe('projectState', () => {
  it('round-trips lz-string encode/decode', () => {
    const state = {
      version: 1 as const,
      share: { item: 'binary-search', mode: 'visualize' as const },
      nodes: [],
      edges: [],
    };
    const encoded = encodeProjectState(state);
    expect(decodeProjectState(encoded)?.share.item).toBe('binary-search');
  });
});
