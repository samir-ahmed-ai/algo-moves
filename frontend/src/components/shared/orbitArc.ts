/** Shared quadratic arc geometry for MoveOrbit and GistArcCaption. */

export const ORBIT_P0 = { x: 40, y: 132 };
export const ORBIT_P1 = { x: 500, y: 4 };
export const ORBIT_P2 = { x: 960, y: 132 };

export const ORBIT_PATH_D = `M ${ORBIT_P0.x} ${ORBIT_P0.y} Q ${ORBIT_P1.x} ${ORBIT_P1.y} ${ORBIT_P2.x} ${ORBIT_P2.y}`;
export const ORBIT_VIEWBOX = '0 28 1000 118';

/** Ticks live on t ∈ [T_MIN, T_MAX] so the arc ends stay clear. */
export const ORBIT_T_MIN = 0.06;
export const ORBIT_T_MAX = 0.94;

/** Point on the quadratic arc at parameter t. */
export function orbitPoint(t: number): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * ORBIT_P0.x + 2 * u * t * ORBIT_P1.x + t * t * ORBIT_P2.x,
    y: u * u * ORBIT_P0.y + 2 * u * t * ORBIT_P1.y + t * t * ORBIT_P2.y,
  };
}

export function truncateOrbitText(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
