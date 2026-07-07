import { useId } from 'react';
import { cn } from '@/lib/utils/cn';
import { OrbitFitText } from './OrbitFitText';
import { ORBIT_PATH_D, ORBIT_VIEWBOX } from './orbitArc';

/** Static arched caption for mobile gist intro — same arc styling as MoveOrbit. */
export function GistArcCaption({
  primary,
  secondary,
  className,
}: {
  primary: string;
  secondary?: string;
  className?: string;
}) {
  const pathId = `gist-arc-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const cur = primary.trim();
  const side = secondary?.trim() ?? '';

  return (
    <svg
      className={cn('move-orbit gist-arc-caption', className)}
      viewBox={ORBIT_VIEWBOX}
      role="group"
      aria-label={primary}
    >
      <path id={pathId} d={ORBIT_PATH_D} className="move-orbit-track" pathLength={1} />
      {side && (
        <OrbitFitText text={side} pathId={pathId} slot="side" className="move-orbit-side" dy={8} />
      )}
      {cur && (
        <OrbitFitText
          text={cur}
          pathId={pathId}
          slot="center"
          className="move-orbit-current"
          dy={-9}
        />
      )}
    </svg>
  );
}
