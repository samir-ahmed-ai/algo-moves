import { useMemo } from 'react';
import { cn } from '../../../lib/cn';

/**
 * Deterministic identicon avatar generated from a seed string — no image
 * assets, no network. The same seed always yields the same face, so a player's
 * avatar is stable across sessions and devices.
 */

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function avatarHue(seed: string): number {
  return hashSeed(seed) % 360;
}

export function Avatar({
  seed,
  name,
  size = 40,
  className,
  ring,
}: {
  seed: string;
  name?: string;
  size?: number;
  className?: string;
  /** Optional colored ring (e.g. the player's team color). */
  ring?: string;
}) {
  const { cells, hue } = useMemo(() => {
    const h = hashSeed(seed || name || 'seed');
    const hue = h % 360;
    // 5 columns × 5 rows, left half mirrored → a symmetric 5×5 face.
    const grid: boolean[] = [];
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 3; x++) {
        const bit = (h >> ((y * 3 + x) % 31)) & 1;
        grid.push(bit === 1);
      }
    }
    const cells: { x: number; y: number }[] = [];
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const col = x < 3 ? x : 4 - x; // mirror
        if (grid[y * 3 + col]) cells.push({ x, y });
      }
    }
    return { cells, hue };
  }, [seed, name]);

  const bg = `hsl(${hue} 65% 92%)`;
  const fg = `hsl(${hue} 62% 42%)`;

  return (
    <span
      className={cn('inline-block shrink-0 overflow-hidden rounded-full', className)}
      style={{
        width: size,
        height: size,
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 5 5" width={size} height={size} style={{ display: 'block' }}>
        <rect width="5" height="5" fill={bg} />
        {cells.map((c) => (
          <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width="1.02" height="1.02" fill={fg} />
        ))}
      </svg>
    </span>
  );
}
