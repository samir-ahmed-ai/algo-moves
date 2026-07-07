import { describe, expect, it } from 'vitest';
import {
  applyRemotePlayback,
  buildPlaybackState,
  nextCollabPhase,
  shouldMirrorPlayback,
  shouldPublishPlayback,
} from './collabPlayback';

describe('collabPlayback', () => {
  it('host publishes only when frame follow is enabled', () => {
    expect(shouldPublishPlayback(true, true, true)).toBe(true);
    expect(shouldPublishPlayback(false, true, true)).toBe(false);
    expect(shouldPublishPlayback(true, false, true)).toBe(false);
  });

  it('guests mirror only when frame follow is enabled', () => {
    expect(shouldMirrorPlayback(true, false, true)).toBe(true);
    expect(shouldMirrorPlayback(true, true, true)).toBe(false);
  });

  it('applyRemotePlayback ignores mismatched node ids', () => {
    const pb = buildPlaybackState('viz-1', 3, false);
    expect(applyRemotePlayback(0, pb, 'viz-2')).toBeNull();
    expect(applyRemotePlayback(0, pb, 'viz-1')).toBe(3);
    expect(applyRemotePlayback(3, pb, 'viz-1')).toBeNull();
  });

  it('E2E collab flow: join → sync frame → leave', () => {
    let phase = nextCollabPhase('solo', 'join');
    expect(phase).toBe('joined');

    let index = 0;
    const hostPlayback = buildPlaybackState('viz-main', 4, true);
    const guestIndex = applyRemotePlayback(index, hostPlayback, 'viz-main');
    expect(guestIndex).toBe(4);
    index = guestIndex ?? index;
    phase = nextCollabPhase(phase, 'sync-frame');
    expect(phase).toBe('synced');
    expect(index).toBe(4);

    phase = nextCollabPhase(phase, 'leave');
    expect(phase).toBe('left');
  });
});
