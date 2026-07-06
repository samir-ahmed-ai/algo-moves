import { useId, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { Frame } from '../../core/types';
import { cn } from '@/lib/utils/cn';
import { OrbitFitText } from './OrbitFitText';
import {
  ORBIT_PATH_D,
  ORBIT_T_MAX,
  ORBIT_T_MIN,
  ORBIT_VIEWBOX,
  orbitArcFraction,
  orbitPoint,
} from './orbitArc';

export { orbitArcFraction, orbitPoint, truncateOrbitText } from './orbitArc';

/*
 * MoveOrbit — the circular step view: an arc curved around the top of the
 * animation. Every frame is a tone-colored tick on the arc, progress fills
 * along it, and the current caption rides the full curve (up to two lines).
 * Click a tick or drag along the arc to seek.
 */

const MAX_TICKS = 72;

/** Arc parameter for frame i of total. */
export function orbitT(i: number, total: number): number {
  if (total <= 1) return 0.5;
  return ORBIT_T_MIN + (i / (total - 1)) * (ORBIT_T_MAX - ORBIT_T_MIN);
}

/** Decimated tick indices for long runs; always keeps the last frame. */
export function orbitTickIndices(total: number, maxTicks = MAX_TICKS): number[] {
  if (total <= maxTicks) return Array.from({ length: total }, (_, i) => i);
  const step = Math.ceil(total / maxTicks);
  const out: number[] = [];
  for (let i = 0; i < total; i += step) out.push(i);
  if (out[out.length - 1] !== total - 1) out.push(total - 1);
  return out;
}

/** Invert x(t) (monotonic) — maps a click/drag x back to the arc parameter. */
export function orbitTFromX(x: number): number {
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    if (orbitPoint(mid).x < x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function frameText(f: Frame | undefined): string {
  return f ? (f.move.caption?.trim() || f.move.note?.trim() || '') : '';
}

export function MoveOrbit({
  frames,
  index,
  onSeek,
  className,
}: {
  frames: Frame[];
  index: number;
  onSeek?: (i: number) => void;
  className?: string;
}) {
  const pathId = `orbit-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const total = frames.length;
  if (total <= 1) return null;

  const cur = frameText(frames[index]);
  const tCur = orbitT(index, total);
  const curPt = orbitPoint(tCur);
  const ticks = orbitTickIndices(total);

  const toneFill = (f: Frame) =>
    f.move.tone === 'good'
      ? 'var(--good)'
      : f.move.tone === 'bad'
        ? 'var(--bad)'
        : 'color-mix(in srgb, var(--edge) 60%, var(--text-3))';

  const seekFromPointer = (e: ReactPointerEvent<SVGElement>) => {
    if (!onSeek || !svgRef.current) return;
    // Map through the CTM so letterboxing/zoom can't skew the click → frame math.
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const t = orbitTFromX(p.x);
    const frac = Math.min(1, Math.max(0, (t - ORBIT_T_MIN) / (ORBIT_T_MAX - ORBIT_T_MIN)));
    onSeek(Math.round(frac * (total - 1)));
  };

  return (
    <svg
      ref={svgRef}
      className={cn('move-orbit', className)}
      viewBox={ORBIT_VIEWBOX}
      role="group"
      aria-label={`step ${index + 1} of ${total}`}
    >
      <path id={pathId} d={ORBIT_PATH_D} className="move-orbit-track" pathLength={1} />
      <path
        d={ORBIT_PATH_D}
        className="move-orbit-progress"
        pathLength={1}
        style={{ strokeDasharray: `${orbitArcFraction(tCur)} 1` }}
      />
      {/* wide invisible hit band: click / drag anywhere on the arc to scrub */}
      {onSeek && (
        <path
          d={ORBIT_PATH_D}
          className="nodrag move-orbit-hit"
          onPointerDown={(e) => {
            seekFromPointer(e);
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* pointer already gone (synthetic/cancelled) — click still seeked */
            }
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) seekFromPointer(e);
          }}
        />
      )}
      {ticks.map((i) => {
        const p = orbitPoint(orbitT(i, total));
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={1.6}
            className="move-orbit-tick"
            style={{ fill: toneFill(frames[i]) }}
          >
            <title>{`${i + 1}/${total}${frameText(frames[i]) ? ` — ${frameText(frames[i])}` : ''}`}</title>
          </circle>
        );
      })}
      <circle cx={curPt.x} cy={curPt.y} r={5.25} className="move-orbit-halo" />
      <circle cx={curPt.x} cy={curPt.y} r={2.75} className="move-orbit-cursor" />
      {cur && (
        <OrbitFitText
          key={cur}
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
