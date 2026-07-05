import { useId, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { Frame } from '../../core/types';
import { cn } from '@/lib/utils/cn';
import {
  ORBIT_PATH_D,
  ORBIT_T_MAX,
  ORBIT_T_MIN,
  ORBIT_VIEWBOX,
  orbitPoint,
  truncateOrbitText,
} from './orbitArc';

export { orbitPoint, truncateOrbitText } from './orbitArc';

/*
 * MoveOrbit — the circular step view: an arc curved around the top of the
 * animation. Every frame is a tone-colored tick on the arc, progress fills
 * along it, and the changing text rides the curve — previous / next captions
 * ghosted at the shoulders, the current caption at the apex. Click a tick or
 * drag along the arc to seek.
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

const ARC_SAMPLES = 96;
let arcTable: number[] | null = null;
function arcLengths(): number[] {
  if (arcTable) return arcTable;
  const lens = [0];
  let prev = orbitPoint(0);
  for (let i = 1; i <= ARC_SAMPLES; i++) {
    const p = orbitPoint(i / ARC_SAMPLES);
    lens.push(lens[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  arcTable = lens;
  return lens;
}

/** Arc-length fraction at parameter t — dash progress must match tick positions. */
export function orbitArcFraction(t: number): number {
  const lens = arcLengths();
  const total = lens[ARC_SAMPLES];
  const ft = Math.min(1, Math.max(0, t)) * ARC_SAMPLES;
  const i = Math.floor(ft);
  const partial = i >= ARC_SAMPLES ? lens[ARC_SAMPLES] : lens[i] + (lens[i + 1] - lens[i]) * (ft - i);
  return partial / total;
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

  const cur = truncateOrbitText(frameText(frames[index]), 56);
  const prev = index > 0 ? truncateOrbitText(frameText(frames[index - 1]), 26) : '';
  const next = index < total - 1 ? truncateOrbitText(frameText(frames[index + 1]), 26) : '';
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
            r={3.2}
            className="move-orbit-tick"
            style={{ fill: toneFill(frames[i]) }}
          >
            <title>{`${i + 1}/${total}${frameText(frames[i]) ? ` — ${frameText(frames[i])}` : ''}`}</title>
          </circle>
        );
      })}
      <circle cx={curPt.x} cy={curPt.y} r={10.5} className="move-orbit-halo" />
      <circle cx={curPt.x} cy={curPt.y} r={5.5} className="move-orbit-cursor" />
      {prev && (
        <text className="nodrag move-orbit-side" dy={16} onClick={onSeek ? () => onSeek(index - 1) : undefined}>
          <textPath href={`#${pathId}`} startOffset="13%" textAnchor="middle">
            {prev}
          </textPath>
        </text>
      )}
      {next && (
        <text className="nodrag move-orbit-side" dy={16} onClick={onSeek ? () => onSeek(index + 1) : undefined}>
          <textPath href={`#${pathId}`} startOffset="87%" textAnchor="middle">
            {next}
          </textPath>
        </text>
      )}
      <text key={cur} className="move-orbit-current" dy={-17}>
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
          {cur}
        </textPath>
      </text>
    </svg>
  );
}
