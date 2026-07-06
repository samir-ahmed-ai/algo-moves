import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { resolveShareItemId, encodeShare, decodeShare, buildInviteUrl, buildWorkspaceEntryUrl, readRoomFromUrl } from './shareState';

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

    it('preserves trackId', () => {
      const state = { trackId: 'data-structures', focus: 'problem' as const, theme: 'dark' };
      const decoded = decodeShare(encodeShare(state));
      expect(decoded?.trackId).toBe('data-structures');
    });

    it('preserves problem id (manifest number)', () => {
      const state = {
        item: 'prep-arrays-find-duplicate-and-missing',
        id: '1.6',
        mode: 'learn',
        focus: 'problem' as const,
      };
      const decoded = decodeShare(encodeShare(state));
      expect(decoded).toEqual(state);
    });
  });

  describe('buildWorkspaceEntryUrl', () => {
    const original = globalThis.location;

    beforeEach(() => {
      // @ts-expect-error mocking location
      globalThis.location = { origin: 'https://test.app', pathname: '/', hash: '', search: '' };
    });

    afterEach(() => {
      globalThis.location = original;
    });

    it('builds a canvas URL when no itemId or trackId is given', () => {
      const url = buildWorkspaceEntryUrl({ theme: 'dark' });
      expect(url).toContain('/workspace#s=');
      const decoded = decodeShare(url.split('#s=')[1]);
      expect(decoded?.mode).toBe('visualize');
      expect(decoded?.focus).toBe('canvas');
    });

    it('builds a problem URL when itemId is given', () => {
      const url = buildWorkspaceEntryUrl({ itemId: 'two-sum', mode: 'play' });
      const decoded = decodeShare(url.split('#s=')[1]);
      expect(decoded?.item).toBe('two-sum');
      expect(decoded?.mode).toBe('play');
      expect(decoded?.focus).toBe('problem');
    });

    it('defaults problem mode to learn', () => {
      const url = buildWorkspaceEntryUrl({ itemId: 'two-sum' });
      const decoded = decodeShare(url.split('#s=')[1]);
      expect(decoded?.mode).toBe('learn');
    });

    it('includes manifest number as id for prep problems', () => {
      const url = buildWorkspaceEntryUrl({ itemId: 'prep-arrays-find-duplicate-and-missing' });
      const decoded = decodeShare(url.split('#s=')[1]);
      expect(decoded?.item).toBe('prep-arrays-find-duplicate-and-missing');
      expect(decoded?.id).toBe('1.6');
    });

    it('builds a track-browse URL when trackId is given', () => {
      const url = buildWorkspaceEntryUrl({ trackId: 'go' });
      const decoded = decodeShare(url.split('#s=')[1]);
      expect(decoded?.trackId).toBe('go');
      expect(decoded?.focus).toBe('problem');
      expect(decoded?.item).toBeUndefined();
      expect(decoded?.mode).toBeUndefined();
    });
  });

  describe('resolveShareItemId', () => {
    it('resolves from item slug', () => {
      expect(resolveShareItemId({ item: 'prep-arrays-find-duplicate-and-missing' })).toBe(
        'prep-arrays-find-duplicate-and-missing',
      );
    });

    it('resolves from manifest id number when item is omitted', () => {
      expect(resolveShareItemId({ id: '1.6', mode: 'learn' })).toBe('prep-arrays-find-duplicate-and-missing');
    });

    it('prefers valid item slug over id', () => {
      expect(
        resolveShareItemId({ item: 'prep-arrays-find-duplicate-and-missing', id: '9.9' }),
      ).toBe('prep-arrays-find-duplicate-and-missing');
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
      expect(url).toContain('/workspace#s=');
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
