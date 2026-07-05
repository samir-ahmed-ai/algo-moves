import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { encodeShare, decodeShare, buildInviteUrl, readRoomFromUrl } from './shareState';

describe('shareState', () => {
  describe('encodeShare / decodeShare round-trip', () => {
    it('preserves all fields including room and sessionKind', () => {
      const state = {
        item: 'two-sum',
        mode: 'visualize',
        focus: 'canvas' as const,
        theme: 'dark',
        room: 'ABCD1234',
        sessionKind: 'interview' as const,
      };
      const encoded = encodeShare(state);
      const decoded = decodeShare(encoded);
      expect(decoded).toEqual(state);
    });
  });

  describe('buildInviteUrl', () => {
    const original = globalThis.location;

    beforeEach(() => {
      // @ts-expect-error mocking location
      globalThis.location = { origin: 'https://test.app', pathname: '/', hash: '', search: '' };
    });

    afterEach(() => {
      globalThis.location = original;
    });

    it('embeds room in the share hash', () => {
      const url = buildInviteUrl(
        { mode: 'visualize', focus: 'canvas', theme: 'dark' },
        'WXYZ9999',
      );
      expect(url).toContain('#s=');
      const hashPart = url.split('#s=')[1];
      const decoded = decodeShare(hashPart);
      expect(decoded?.room).toBe('WXYZ9999');
      expect(decoded?.focus).toBe('canvas');
    });
  });

  describe('readRoomFromUrl', () => {
    const original = globalThis.location;

    beforeEach(() => {
      // @ts-expect-error mocking location
      delete globalThis.location;
    });

    afterEach(() => {
      globalThis.location = original;
    });

    it('extracts room from share hash', () => {
      const encoded = encodeShare({ room: 'TESTCODE', mode: 'visualize' });
      // @ts-expect-error mocking location
      globalThis.location = { hash: `#s=${encoded}` };
      expect(readRoomFromUrl()).toBe('TESTCODE');
    });

    it('returns null when no room present', () => {
      const encoded = encodeShare({ mode: 'visualize' });
      // @ts-expect-error mocking location
      globalThis.location = { hash: `#s=${encoded}` };
      expect(readRoomFromUrl()).toBeNull();
    });
  });
});
