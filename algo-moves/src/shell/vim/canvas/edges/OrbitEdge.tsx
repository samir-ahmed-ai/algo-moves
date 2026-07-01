import { BaseEdge, type EdgeProps } from '@xyflow/react';
import { useVimGame } from '../VimGameProvider';
import { getWavyEdgePath } from './wavyPath';

export function OrbitEdge({ id, sourceX, sourceY, targetX, targetY }: EdgeProps) {
  const { lastMotionOk } = useVimGame();

  const [path] = getWavyEdgePath(sourceX, sourceY, targetX, targetY, {
    waves: 3,
    amplitude: 10,
  });

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke: lastMotionOk ? 'var(--accent)' : 'var(--edge-active)',
        strokeWidth: 1.75,
        opacity: 0.85,
        transition: 'stroke 0.25s ease',
      }}
    />
  );
}
