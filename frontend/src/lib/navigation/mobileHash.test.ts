import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildMobileModeUrl, parseMobileHash, writeMobileHash } from './mobileHash';

describe('mobileHash', () => {
  it('parses bare mobile hash on the mobile page', () => {
    expect(parseMobileHash('', '/mobile')).toEqual({});
    expect(parseMobileHash('#mobile')).toEqual({});
  });

  it('parses topic deep link', () => {
    expect(parseMobileHash('#topic/prep-arrays-all', '/mobile')).toEqual({ topicId: 'prep-arrays-all' });
    expect(parseMobileHash('#mobile/topic/prep-arrays-all')).toEqual({ topicId: 'prep-arrays-all' });
  });

  it('parses topic and item deep link', () => {
    expect(parseMobileHash('#topic/prep-arrays-all/item/prep-arrays-two-sum', '/mobile')).toEqual({
      topicId: 'prep-arrays-all',
      itemId: 'prep-arrays-two-sum',
    });
    expect(parseMobileHash('#mobile/topic/prep-arrays-all/item/prep-arrays-two-sum')).toEqual({
      topicId: 'prep-arrays-all',
      itemId: 'prep-arrays-two-sum',
    });
  });

  it('returns null for non-mobile hash', () => {
    expect(parseMobileHash('#home', '/home')).toBeNull();
  });
});

describe('buildMobileModeUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('history', {
      replaceState: vi.fn(),
      pushState: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds mobile mode URL from current location', () => {
    vi.stubGlobal('location', {
      origin: 'http://192.168.1.5:4321',
      pathname: '/algo-moves/mobile',
      search: '',
    });
    expect(buildMobileModeUrl()).toBe('http://192.168.1.5:4321/mobile');
  });

  it('preserves existing search params in the mobile launch URL', () => {
    vi.stubGlobal('location', {
      origin: 'http://192.168.1.5:4321',
      pathname: '/algo-moves/mobile',
      search: '?seed=1',
    });
    expect(buildMobileModeUrl()).toBe('http://192.168.1.5:4321/mobile?seed=1');
  });

  it('writes a default-track category hash when only category is supplied', () => {
    vi.stubGlobal('location', {
      origin: 'http://192.168.1.5:4321',
      pathname: '/algo-moves/mobile',
      search: '?seed=1',
    });
    const replace = vi.spyOn(history, 'replaceState').mockImplementation(() => {});
    writeMobileHash({ categoryId: 'prep-arrays-all', itemId: 'two-sum' });
    expect(replace).toHaveBeenCalledWith(
      null,
      '',
      '/mobile?seed=1#track/interview-prep/category/prep-arrays-all/item/two-sum',
    );
  });
});

describe('parseMobileHash decode', () => {
  it('decodes percent-encoded segments', () => {
    expect(parseMobileHash('#topic/prep%2Darrays%2Dall', '/mobile')).toEqual({
      topicId: 'prep-arrays-all',
    });
  });

  it('decodes legacy topic item hashes', () => {
    expect(
      parseMobileHash(
        '#mobile/topic/prep%2Darrays%2Dall/item/prep%2Dtwo%20sum',
      ),
    ).toEqual({
      topicId: 'prep-arrays-all',
      itemId: 'prep-two sum',
    });
  });
});
