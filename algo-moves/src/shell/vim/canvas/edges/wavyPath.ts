export interface WavyPathOptions {
  waves?: number;
  amplitude?: number;
  steps?: number;
}

/** Sine-wave edge path with label anchor at the visual midpoint. */
export function getWavyEdgePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  opts: WavyPathOptions = {},
): [path: string, labelX: number, labelY: number] {
  const waves = opts.waves ?? 4;
  const amplitude = opts.amplitude ?? 14;
  const steps = opts.steps ?? waves * 10;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;

  const waveAt = (t: number) => {
    const envelope = 1 - Math.pow(Math.abs(t - 0.5) * 2, 1.6) * 0.35;
    return Math.sin(t * Math.PI * waves) * amplitude * envelope;
  };

  const pointAt = (t: number) => {
    const w = waveAt(t);
    return {
      x: sourceX + dx * t + px * w,
      y: sourceY + dy * t + py * w,
    };
  };

  let path = `M ${sourceX} ${sourceY}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const { x, y } = pointAt(t);
    path += ` L ${x} ${y}`;
  }

  const mid = pointAt(0.5);
  return [path, mid.x, mid.y];
}
