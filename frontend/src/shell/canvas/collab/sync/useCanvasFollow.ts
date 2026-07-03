import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasCollab } from '../CanvasCollabProvider';

/**
 * Figma-style follow mode: while a peer is followed, mirror their viewport
 * (pan + zoom) onto the local canvas as they move. Call once inside the canvas.
 */
export function useCanvasFollow(): void {
  const { followId, peers } = useCanvasCollab();
  const { setViewport } = useReactFlow();
  const vp = peers.find((p) => p.id === followId)?.viewport;
  const x = vp?.x;
  const y = vp?.y;
  const zoom = vp?.zoom;

  useEffect(() => {
    if (!followId || x == null || y == null || zoom == null) return;
    setViewport({ x, y, zoom }, { duration: 120 });
  }, [followId, x, y, zoom, setViewport]);
}
