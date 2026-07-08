/** Shared quadratic arc geometry for orbit captions and step scrubbers. */

export const ORBIT_P0 = { x: 40, y: 132 };
export const ORBIT_P1 = { x: 500, y: 4 };
export const ORBIT_P2 = { x: 960, y: 132 };

export const ORBIT_PATH_D = `M ${ORBIT_P0.x} ${ORBIT_P0.y} Q ${ORBIT_P1.x} ${ORBIT_P1.y} ${ORBIT_P2.x} ${ORBIT_P2.y}`;
/** Extra headroom above the arc for a two-line center caption. */
export const ORBIT_VIEWBOX = '0 4 1000 148';

/** Ticks live on t ∈ [T_MIN, T_MAX] so the arc ends stay clear. */
export const ORBIT_T_MIN = 0.06;
export const ORBIT_T_MAX = 0.94;

const MAX_ORBIT_TICKS = 72;

function positiveInt(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.max(1, Math.round(value)) : fallback;
}

function clampFrameIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Number.isFinite(index) ? Math.min(total - 1, Math.max(0, Math.round(index))) : 0;
}

/** Arc parameter for frame i of total. */
export function orbitT(i: number, total: number): number {
  const frameTotal = positiveInt(total, 1);
  if (frameTotal <= 1) return 0.5;
  const frameIndex = clampFrameIndex(i, frameTotal);
  return ORBIT_T_MIN + (frameIndex / (frameTotal - 1)) * (ORBIT_T_MAX - ORBIT_T_MIN);
}

/** Decimated tick indices for long runs; always keeps the last frame. */
export function orbitTickIndices(total: number, maxTicks = MAX_ORBIT_TICKS): number[] {
  const frameTotal = positiveInt(total, 0);
  const tickLimit = positiveInt(maxTicks, MAX_ORBIT_TICKS);
  if (frameTotal === 0) return [];
  if (frameTotal <= tickLimit) return Array.from({ length: frameTotal }, (_, i) => i);
  const step = Math.ceil(frameTotal / tickLimit);
  const out: number[] = [];
  for (let i = 0; i < frameTotal; i += step) out.push(i);
  if (out[out.length - 1] !== frameTotal - 1) out.push(frameTotal - 1);
  return out;
}

/** Invert x(t) (monotonic) — maps a click/drag x back to the arc parameter. */
export function orbitTFromX(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    if (orbitPoint(mid).x < x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, finiteOr(value, 0.5)));
}

/** Point on the quadratic arc at parameter t. */
export function orbitPoint(t: number): { x: number; y: number } {
  const tt = clampUnit(t);
  const u = 1 - tt;
  return {
    x: u * u * ORBIT_P0.x + 2 * u * tt * ORBIT_P1.x + tt * tt * ORBIT_P2.x,
    y: u * u * ORBIT_P0.y + 2 * u * tt * ORBIT_P1.y + tt * tt * ORBIT_P2.y,
  };
}

export function truncateOrbitText(s: string, max: number): string {
  const t = s.trim();
  const maxChars = Math.max(0, Math.round(finiteOr(max, 0)));
  return t.length <= maxChars ? t : `${t.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

const ARC_SAMPLES = 96;
let arcTable: number[] | null = null;

function arcLengths(): number[] {
  if (arcTable) return arcTable;
  const lens = [0];
  let prev = orbitPoint(0);
  for (let i = 1; i <= ARC_SAMPLES; i++) {
    const p = orbitPoint(i / ARC_SAMPLES);
    const prevLen = lens[i - 1] ?? 0;
    lens.push(prevLen + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  arcTable = lens;
  return lens;
}

/** Total geometric length of the orbit arc in SVG user units. */
export function orbitPathLength(): number {
  return arcLengths()[ARC_SAMPLES] ?? 0;
}

/** Arc-length fraction at parameter t — dash progress must match tick positions. */
export function orbitArcFraction(t: number): number {
  const lens = arcLengths();
  const total = lens[ARC_SAMPLES] ?? 1;
  const ft = clampUnit(t) * ARC_SAMPLES;
  const i = Math.floor(ft);
  let partial: number;
  if (i >= ARC_SAMPLES) {
    partial = lens[ARC_SAMPLES] ?? total;
  } else {
    const base = lens[i] ?? 0;
    const next = lens[i + 1] ?? base;
    partial = base + (next - base) * (ft - i);
  }
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

  const firstWord = words[0];
  if (!firstWord) return [];

  const lines: string[] = [];
  let current = firstWord;
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;
    const candidate = `${current} ${word}`;
    if (measure(candidate) <= budget) current = candidate;
    else {
      lines.push(current);
      current = word;
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

/** Start at max font; try one line, then two, before stepping down. */
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
    const measure = (line: string) => measureLine(line, size);
    if (measure(trimmed) <= budget) {
      return { fontSize: size, lines: orbitLinesWithStretch([trimmed], measure, budget) };
    }
    if (maxLines >= 2) {
      const lines = wrapOrbitTwoLines(trimmed, measure, budget);
      if (lines.length <= 2 && lines.every((line) => measure(line) <= budget)) {
        return { fontSize: size, lines: orbitLinesWithStretch(lines, measure, budget) };
      }
    }
  }

  const size = min;
  const measure = (line: string) => measureLine(line, size);
  let lines =
    maxLines >= 2
      ? wrapOrbitTwoLines(trimmed, measure, budget)
      : wrapOrbitLines(trimmed, measure, budget);
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

export type OrbitFontConfig = { max: number; min: number; maxLines: number };

export const ORBIT_FONT = {
  center: { max: 20, min: 10, maxLines: 2 },
  side: { max: 12, min: 8, maxLines: 2 },
} as const satisfies Record<'center' | 'side', OrbitFontConfig>;

/** Larger arc captions for mobile gist intro cards. */
export const GIST_ORBIT_FONT = {
  center: { max: 26, min: 12, maxLines: 2 },
  side: { max: 14, min: 9, maxLines: 2 },
} as const satisfies Record<'center' | 'side', OrbitFontConfig>;
