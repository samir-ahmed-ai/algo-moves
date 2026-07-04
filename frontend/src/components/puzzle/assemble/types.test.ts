import { describe, expect, it } from 'vitest';
import {
  assembleGameSeconds,
  createAssembleGameStats,
  isBetterAssembleTime,
  parseAssembleBestSeconds,
  resolveAssembleBestSeconds,
} from './types';

describe('assemble game helpers', () => {
  it('creates clamped completion stats', () => {
    expect(createAssembleGameStats(1000, 1750)).toEqual({ mistakes: 0, ms: 750, perfect: true });
    expect(createAssembleGameStats(2000, 1500, 1)).toEqual({ mistakes: 1, ms: 0, perfect: false });
  });

  it('parses persisted best seconds defensively', () => {
    expect(assembleGameSeconds({ mistakes: 0, ms: 1250, perfect: true })).toBe(1.25);
    expect(parseAssembleBestSeconds('3.5')).toBe(3.5);
    expect(parseAssembleBestSeconds('0')).toBeNull();
    expect(parseAssembleBestSeconds(null)).toBeNull();
  });

  it('resolves migrated bests and compares new runs', () => {
    expect(resolveAssembleBestSeconds('2.1', '3.4')).toBe(2.1);
    expect(resolveAssembleBestSeconds(null, '3.4')).toBe(3.4);
    expect(resolveAssembleBestSeconds('bad', '0')).toBeNull();
    expect(isBetterAssembleTime(2.9, 3)).toBe(true);
    expect(isBetterAssembleTime(3.1, 3)).toBe(false);
    expect(isBetterAssembleTime(0, null)).toBe(false);
  });
});
