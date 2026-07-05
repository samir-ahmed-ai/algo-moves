import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildInterviewInviteUrl, decodeShare } from '@/store/navigation/shareState';

function shareFromUrl(url: string) {
  const hash = url.split('#')[1] ?? '';
  const part = hash.split('&').find((p) => p.startsWith('s='));
  return part ? decodeShare(part.slice(2)) : null;
}

describe('buildInterviewInviteUrl', () => {
  const original = globalThis.location;
  beforeEach(() => {
    // @ts-expect-error mocking location
    globalThis.location = { origin: 'https://test.app', pathname: '/', hash: '', search: '' };
  });
  afterEach(() => {
    globalThis.location = original;
  });

  it('embeds the interview session kind and guest token', () => {
    const share = shareFromUrl(buildInterviewInviteUrl({ mode: 'visualize' }, 'ABCD', 'tok123'));
    expect(share?.sessionKind).toBe('interview');
    expect(share?.guestToken).toBe('tok123');
    expect(share?.room).toBe('ABCD');
  });

  it('omits the token when none is provided (DB-less fallback)', () => {
    const share = shareFromUrl(buildInterviewInviteUrl({}, 'WXYZ'));
    expect(share?.sessionKind).toBe('interview');
    expect(share?.guestToken).toBeUndefined();
    expect(share?.room).toBe('WXYZ');
  });
});
