import { describe, expect, it } from 'vitest';
import {
  NAMED_LAYOUT_PRESETS,
  NAMED_LAYOUT_PRESET_META,
  resolveNamedLayoutPreset,
} from './layoutPresets';

describe('named layout presets', () => {
  it('maps study/exam/demo to canonical presets', () => {
    expect(NAMED_LAYOUT_PRESETS.study).toBe('TraceFocus');
    expect(NAMED_LAYOUT_PRESETS.exam).toBe('Minimal');
    expect(NAMED_LAYOUT_PRESETS.demo).toBe('Demo');
  });

  it('resolveNamedLayoutPreset accepts named and canonical ids', () => {
    expect(resolveNamedLayoutPreset('study')).toBe('TraceFocus');
    expect(resolveNamedLayoutPreset('exam')).toBe('Minimal');
    expect(resolveNamedLayoutPreset('Demo')).toBe('Demo');
    expect(resolveNamedLayoutPreset('unknown')).toBeNull();
  });

  it('exposes UI meta for each named preset', () => {
    expect(NAMED_LAYOUT_PRESET_META.study.layoutPreset).toBe('TraceFocus');
    expect(NAMED_LAYOUT_PRESET_META.exam.label).toBe('Exam');
    expect(NAMED_LAYOUT_PRESET_META.demo.description).toMatch(/presentation/i);
  });
});
