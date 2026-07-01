import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildMobileModeUrl, parseMobileHash } from './mobileHash';

describe('mobileHash', () => {
  it('parses bare mobile hash', () => {
    expect(parseMobileHash('#mobile')).toEqual({});
  });

  it('parses topic deep link', () => {
    expect(parseMobileHash('#mobile/topic/prep-arrays-all')).toEqual({ topicId: 'prep-arrays-all' });
  });

  it('parses topic and item deep link', () => {
    expect(parseMobileHash('#mobile/topic/prep-arrays-all/item/prep-arrays-two-sum')).toEqual({
      topicId: 'prep-arrays-all',
      itemId: 'prep-arrays-two-sum',
    });
  });

  it('returns null for non-mobile hash', () => {
    expect(parseMobileHash('#home')).toBeNull();
  });
});

describe('buildMobileModeUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds mobile mode URL from current location', () => {
    vi.stubGlobal('location', {
      origin: 'http://192.168.1.5:4321',
      pathname: '/algo-moves/',
    });
    expect(buildMobileModeUrl()).toBe('http://192.168.1.5:4321/algo-moves/#mobile');
  });
});
