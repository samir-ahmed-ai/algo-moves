import { useId, useMemo } from 'react';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

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
  ring?: string;
}) {
  const gradientId = `avatar-gradient-${useId().replace(/:/g, '')}`;
  const { cells, hue } = useMemo(() => {
    const h = hashSeed(seed || name || 'seed');
    const hue = h % 360;
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
        const col = x < 3 ? x : 4 - x;
        if (grid[y * 3 + col]) cells.push({ x, y });
      }
    }
    return { cells, hue };
  }, [seed, name]);

  const safeSize = Number.isFinite(size) ? Math.max(16, Math.round(size)) : 40;
  const bg = `hsl(${hue} 78% 94%)`;
  const bg2 = `hsl(${(hue + 42) % 360} 74% 88%)`;
  const fg = `hsl(${hue} 68% 36%)`;
  const glow = `hsl(${hue} 72% 50% / 0.22)`;

  return (
    <span
      className={cx(
        'design-avatar inline-block shrink-0 overflow-hidden rounded-full align-middle',
        className,
      )}
      style={{
        width: safeSize,
        height: safeSize,
        boxShadow: ring
          ? `0 0 0 2px ${ring}, 0 10px 24px ${glow}`
          : `0 10px 24px ${glow}, inset 0 0 0 1px hsl(0 0% 100% / 0.72)`,
      }}
      role={name ? 'img' : undefined}
      aria-label={name ? `${name} avatar` : undefined}
      aria-hidden={name ? undefined : true}
    >
      <svg
        className="design-avatar__svg"
        viewBox="0 0 5 5"
        width={safeSize}
        height={safeSize}
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={bg} />
            <stop offset="100%" stopColor={bg2} />
          </linearGradient>
        </defs>
        <rect width="5" height="5" fill={`url(#${gradientId})`} />
        <circle cx="1.1" cy="0.9" r="1.15" fill="white" opacity="0.32" />
        {cells.map((c) => (
          <rect
            key={`${c.x}-${c.y}`}
            x={c.x}
            y={c.y}
            width="1.02"
            height="1.02"
            rx="0.18"
            fill={fg}
          />
        ))}
      </svg>
    </span>
  );
}
