import { useId } from 'react';
import { cn } from '@/lib/utils/cn';
import { ORBIT_PATH_D, ORBIT_VIEWBOX, truncateOrbitText } from './orbitArc';

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
  const cur = truncateOrbitText(primary, 56);
  const side = secondary ? truncateOrbitText(secondary, 26) : '';

  return (
    <svg
      className={cn('move-orbit gist-arc-caption', className)}
      viewBox={ORBIT_VIEWBOX}
      role="group"
      aria-label={primary}
    >
      <path id={pathId} d={ORBIT_PATH_D} className="move-orbit-track" pathLength={1} />
      {side && (
        <text className="move-orbit-side" dy={16}>
          <textPath href={`#${pathId}`} startOffset="87%" textAnchor="middle">
            {side}
          </textPath>
        </text>
      )}
      <text className="move-orbit-current" dy={-17}>
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
          {cur}
        </textPath>
      </text>
    </svg>
  );
}
