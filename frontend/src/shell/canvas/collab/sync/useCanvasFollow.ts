import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasCollab } from '../CanvasCollabProvider';

/**
 * Figma-style follow mode: while a peer is followed, mirror their viewport
 * (pan + zoom) onto the local canvas as they move. Call once inside the canvas.
 *
 * Interview "follow me": when the host enables it, every guest auto-pins the
 * host as the followed peer (releasing only the auto-pin, not a manual follow).
 */
export function useCanvasFollow(): void {
  const { followId, setFollowId, peers, players, isHost, session } = useCanvasCollab();
  const { setViewport } = useReactFlow();

  const hostFollow = session.interviewRuntime?.hostFollow === true;
  const hostId = players.find((p) => p.role === 'host')?.id ?? null;
  const autoPinned = useRef(false);

  useEffect(() => {
    if (isHost) return;
    if (hostFollow && hostId) {
      setFollowId(hostId);
      autoPinned.current = true;
    } else if (autoPinned.current) {
      // Release only the auto-pin so a manual follow the guest set isn't clobbered.
      autoPinned.current = false;
      setFollowId(null);
    }
  }, [hostFollow, hostId, isHost, setFollowId]);

  const vp = peers.find((p) => p.id === followId)?.viewport;
  const x = vp?.x;
  const y = vp?.y;
  const zoom = vp?.zoom;

  useEffect(() => {
    if (!followId || x == null || y == null || zoom == null) return;
    setViewport({ x, y, zoom }, { duration: 120 });
  }, [followId, x, y, zoom, setViewport]);
}
