import type { PlaybackState } from '@/lib/session/types';

/** Apply a remote host playback snapshot to a local player index (guest sync). */
export function applyRemotePlayback(
  localIndex: number,
  playback: PlaybackState | undefined,
  nodeId: string,
): number | null {
  if (!playback || playback.nodeId !== nodeId) return null;
  if (playback.index === localIndex) return null;
  return Math.max(0, playback.index);
}

/** Whether the host should publish playback for this panel. */
export function shouldPublishPlayback(
  hostFrameFollow: boolean,
  isHost: boolean,
  isCollaborating: boolean,
): boolean {
  return isCollaborating && isHost && hostFrameFollow;
}

/** Whether a guest should mirror host playback on this panel. */
export function shouldMirrorPlayback(
  hostFrameFollow: boolean,
  isHost: boolean,
  isCollaborating: boolean,
): boolean {
  return isCollaborating && !isHost && hostFrameFollow;
}

/** Build the playback snapshot the host publishes when the scrubber moves. */
export function buildPlaybackState(nodeId: string, index: number, playing: boolean): PlaybackState {
  return { nodeId, index, playing };
}

/** Session lifecycle helpers used by collab E2E tests. */
export type CollabPhase = 'solo' | 'joined' | 'synced' | 'left';

export function nextCollabPhase(phase: CollabPhase, event: 'join' | 'sync-frame' | 'leave'): CollabPhase {
  switch (event) {
    case 'join':
      return phase === 'solo' ? 'joined' : phase;
    case 'sync-frame':
      return phase === 'joined' || phase === 'synced' ? 'synced' : phase;
    case 'leave':
      return 'left';
    default:
      return phase;
  }
}
