/** Shared quadratic arc geometry for MoveOrbit and GistArcCaption. */

export const ORBIT_P0 = { x: 40, y: 132 };
export const ORBIT_P1 = { x: 500, y: 4 };
export const ORBIT_P2 = { x: 960, y: 132 };

export const ORBIT_PATH_D = `M ${ORBIT_P0.x} ${ORBIT_P0.y} Q ${ORBIT_P1.x} ${ORBIT_P1.y} ${ORBIT_P2.x} ${ORBIT_P2.y}`;
/** Extra headroom above the arc for a two-line center caption. */
export const ORBIT_VIEWBOX = '0 4 1000 148';

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

/** Total geometric length of the orbit arc in SVG user units. */
export function orbitPathLength(): number {
  return arcLengths()[ARC_SAMPLES];
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

/** Max text length along the path — center spans the full arc; shoulders use a short band. */
export function orbitTextBudget(slot: 'center' | 'side'): number {
  const total = orbitPathLength();
  return slot === 'center' ? total : total * 0.18;
}

/** textPath placement so captions run from arc start to arc end. */
export function orbitTextSpan(slot: 'center' | 'side'): {
  startOffset: string;
  textAnchor: 'start' | 'middle';
  budget: number;
} {
  const budget = orbitTextBudget(slot);
  if (slot === 'center') {
    return { startOffset: '0%', textAnchor: 'start', budget };
  }
  return { startOffset: '50%', textAnchor: 'middle', budget };
}

/** Start at max size, step down until the measured length fits the arc budget. */
export function fitOrbitFontSize(
  measure: (fontSize: number) => number,
  max: number,
  min: number,
  budget: number,
): number {
  for (let size = max; size >= min; size--) {
    if (measure(size) <= budget) return size;
  }
  return min;
}

function breakLongOrbitToken(
  token: string,
  measure: (line: string) => number,
  budget: number,
): string[] {
  if (measure(token) <= budget) return [token];
  const parts: string[] = [];
  let chunk = '';
  for (const ch of token) {
    const next = chunk + ch;
    if (measure(next) <= budget) chunk = next;
    else {
      if (chunk) parts.push(chunk);
      chunk = ch;
    }
  }
  if (chunk) parts.push(chunk);
  return parts.length ? parts : [token];
}

/** Greedy word wrap — each line must fit the arc-length budget. */
export function wrapOrbitLines(
  text: string,
  measure: (line: string) => number,
  budget: number,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const words: string[] = [];
  for (const word of trimmed.split(/\s+/)) {
    words.push(...breakLongOrbitToken(word, measure, budget));
  }
  if (!words.length) return [];

  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (measure(candidate) <= budget) current = candidate;
    else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

/** Split into exactly two balanced lines that fill the arc end to end. */
export function wrapOrbitTwoLines(
  text: string,
  measure: (line: string) => number,
  budget: number,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (measure(trimmed) <= budget) return [trimmed];

  const words: string[] = [];
  for (const word of trimmed.split(/\s+/)) {
    words.push(...breakLongOrbitToken(word, measure, budget));
  }
  if (words.length <= 1) return [trimmed];

  let best: [string, string] | null = null;
  let bestBalance = Infinity;
  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(' ');
    const line2 = words.slice(i).join(' ');
    const len1 = measure(line1);
    const len2 = measure(line2);
    if (len1 <= budget && len2 <= budget) {
      const balance = Math.abs(len1 - len2);
      if (balance < bestBalance) {
        bestBalance = balance;
        best = [line1, line2];
      }
    }
  }
  if (best) return best;

  return wrapOrbitLines(trimmed, measure, budget).slice(0, 2);
}

export type OrbitTextLine = { text: string; stretch: boolean };
export type OrbitTextLayout = { fontSize: number; lines: OrbitTextLine[] };

const ORBIT_STRETCH_THRESHOLD = 0.96;

function orbitLinesWithStretch(
  lines: string[],
  measure: (line: string) => number,
  budget: number,
): OrbitTextLine[] {
  return lines.map((text) => ({
    text,
    stretch: measure(text) < budget * ORBIT_STRETCH_THRESHOLD,
  }));
}

/** Start at max font, shrink until lines fit; wrap only when a single line won't fit. */
export function fitOrbitMultilineLayout(
  measureLine: (line: string, fontSize: number) => number,
  text: string,
  max: number,
  min: number,
  budget: number,
  maxLines: number,
): OrbitTextLayout {
  const trimmed = text.trim();
  if (!trimmed) return { fontSize: max, lines: [] };

  for (let size = max; size >= min; size--) {
    const width = measureLine(trimmed, size);
    if (width <= budget) {
      return { fontSize: size, lines: orbitLinesWithStretch([trimmed], () => width, budget) };
    }
  }

  if (maxLines >= 2) {
    for (let size = max; size >= min; size--) {
      const measure = (line: string) => measureLine(line, size);
      const lines = wrapOrbitTwoLines(trimmed, measure, budget);
      if (lines.length <= 2 && lines.every((line) => measure(line) <= budget)) {
        return { fontSize: size, lines: orbitLinesWithStretch(lines, measure, budget) };
      }
    }
  }

  const size = min;
  const measure = (line: string) => measureLine(line, size);
  let lines = maxLines >= 2 ? wrapOrbitTwoLines(trimmed, measure, budget) : wrapOrbitLines(trimmed, measure, budget);
  if (lines.length > maxLines) {
    const tail = lines.slice(maxLines - 1).join(' ');
    lines = [...lines.slice(0, maxLines - 1), truncateOrbitText(tail, 48)];
  }
  return { fontSize: size, lines: orbitLinesWithStretch(lines, measure, budget) };
}

/** Perpendicular offset for line i of n stacked along the arc. */
export function orbitLineDy(
  slot: 'center' | 'side',
  baseDy: number,
  lineIndex: number,
  lineCount: number,
  fontSize: number,
  lineHeight = ORBIT_LINE_HEIGHT,
): number {
  const step = fontSize * lineHeight;
  if (slot === 'center') {
    return baseDy - (lineCount - 1 - lineIndex) * step;
  }
  return baseDy + lineIndex * step;
}

export const ORBIT_LINE_HEIGHT = 1.22;

export const ORBIT_FONT = {
  center: { max: 20, min: 10, maxLines: 2 },
  side: { max: 12, min: 8, maxLines: 2 },
} as const;
