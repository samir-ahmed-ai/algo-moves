import { describe, expect, it } from 'vitest';
import {
  panelBorderRadius,
  panelFill,
  panelOpacity,
  panelStroke,
  patchPanelStyle,
  styleSig,
} from './panelStyle';

describe('panelStyle', () => {
  it('maps corner presets to radius tokens', () => {
    expect(panelBorderRadius()).toBe('var(--radius)');
    expect(panelBorderRadius('sharp')).toBe('0');
    expect(panelBorderRadius('soft')).toBe('calc(var(--radius) * 0.5)');
    expect(panelBorderRadius('round')).toBe('calc(var(--radius) * 1.5)');
  });

  it('clamps opacity to 20–100%', () => {
    expect(panelOpacity(undefined)).toBe(1);
    expect(panelOpacity({ opacity: 80 })).toBe(0.8);
    expect(panelOpacity({ opacity: 10 })).toBe(0.2);
    expect(panelOpacity({ opacity: 150 })).toBe(1);
  });

  it('resolves stroke and fill', () => {
    expect(panelStroke(undefined, 'var(--accent)')).toBe('var(--accent)');
    expect(panelStroke({ stroke: 'var(--good)' }, 'var(--accent)')).toBe('var(--good)');
    expect(panelFill({ fill: 'var(--panel2)' })).toBe('var(--panel2)');
    expect(panelFill({ fill: 'transparent' })).toBe('transparent');
    expect(panelFill(undefined)).toBeUndefined();
  });

  it('patches and clears style', () => {
    expect(patchPanelStyle(undefined, { opacity: 60 })).toEqual({ opacity: 60 });
    expect(patchPanelStyle({ opacity: 60, corners: 'sharp' }, { opacity: undefined })).toEqual({ corners: 'sharp' });
    expect(patchPanelStyle({ opacity: 60 }, null)).toBeUndefined();
  });

  it('serializes style for undo signature', () => {
    expect(styleSig({ opacity: 50, corners: 'round' })).toContain('50');
    expect(styleSig(undefined)).toBe('');
  });
});
