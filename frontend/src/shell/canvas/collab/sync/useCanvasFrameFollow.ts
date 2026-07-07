import { useEffect } from 'react';
import { useCanvasFrame } from '../../CanvasContext';
import { useCanvasCollab } from '../CanvasCollabProvider';
import {
  applyRemotePlayback,
  buildPlaybackState,
  shouldMirrorPlayback,
  shouldPublishPlayback,
} from '../protocol/collabPlayback';

/** Classroom follow: host scrubber position → guest frame sync on viz panels. */
export function useCanvasFrameFollow(nodeId: string, enabled = true): void {
  const { player } = useCanvasFrame();
  const { isHost, isCollaborating, session, patchInterviewRuntime } = useCanvasCollab();
  const runtime = session.interviewRuntime;
  const hostFrameFollow = enabled && runtime?.hostFrameFollow === true;
  const { index, isPlaying, goTo } = player;

  useEffect(() => {
    if (!enabled || !shouldPublishPlayback(hostFrameFollow, isHost, isCollaborating)) return;
    patchInterviewRuntime((r) => ({
      ...r,
      playback: buildPlaybackState(nodeId, index, isPlaying),
    }));
  }, [enabled, hostFrameFollow, isHost, isCollaborating, nodeId, index, isPlaying, patchInterviewRuntime]);

  useEffect(() => {
    if (!enabled || !shouldMirrorPlayback(hostFrameFollow, isHost, isCollaborating)) return;
    const next = applyRemotePlayback(index, runtime?.playback, nodeId);
    if (next != null) goTo(next);
  }, [enabled, hostFrameFollow, isHost, isCollaborating, nodeId, index, runtime?.playback, goTo]);
}
