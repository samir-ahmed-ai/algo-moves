import { diffArrays } from 'diff';
import type { AssembleGameStatsStore } from './types';

/* ------------------------------- seeded PRNG ------------------------------ */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ----------------------------- mutation engine ---------------------------- */
/* Produces a near-miss "lie" of a code piece: the same block with exactly one
 * plausible defect (flipped comparison, off-by-one, swapped identifier…).
 * Powers Imposter rounds and Snap Call's mutant decoys. */

const KEYWORDS = new Set([
  // go
  'func', 'for', 'if', 'else', 'return', 'range', 'len', 'append', 'var', 'make',
  'break', 'continue', 'int', 'bool', 'string', 'true', 'false', 'nil', 'map',
  'package', 'import', 'switch', 'case', 'default', 'struct', 'type', 'go', 'defer',
  // python
  'def', 'elif', 'while', 'in', 'not', 'and', 'or', 'None', 'True', 'False',
  'lambda', 'yield', 'pass', 'del', 'class', 'from', 'as', 'with', 'print',
  // java
  'public', 'private', 'static', 'void', 'new', 'null', 'this', 'boolean', 'final',
]);

/** Character index ranges of quoted spans, so mutators never edit string literals. */
function quotedSpans(code: string): [number, number][] {
  const spans: [number, number][] = [];
  const re = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) spans.push([m.index, m.index + m[0].length]);
  return spans;
}

function inSpans(idx: number, spans: [number, number][]): boolean {
  return spans.some(([a, b]) => idx >= a && idx < b);
}

function pickMatch(code: string, re: RegExp, rand: () => number): RegExpExecArray | null {
  const spans = quotedSpans(code);
  const hits: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(code)) !== null) {
    if (!inSpans(m.index, spans)) hits.push(m);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  if (hits.length === 0) return null;
  return hits[Math.floor(rand() * hits.length)];
}

function splice(code: string, start: number, len: number, insert: string): string {
  return code.slice(0, start) + insert + code.slice(start + len);
}

type Mutator = (code: string, rand: () => number, siblings: string[]) => string | null;

const COMPARISON_FLIP: Record<string, string> = {
  '<=': '<', '<': '<=', '>=': '>', '>': '>=', '==': '!=', '!=': '==',
};

const mutators: Mutator[] = [
  // comparison flip — bare < > require surrounding whitespace so arrows (->)
  // and generics (List<String>) never produce syntactically-invalid mutants
  (code, rand) => {
    const m = pickMatch(code, /<=|>=|==|!=|(?<=\s)<(?![<=-])|(?<=\s)(?<!-)>(?![>=])/g, rand);
    return m ? splice(code, m.index, m[0].length, COMPARISON_FLIP[m[0]]) : null;
  },
  // increment/decrement + arithmetic swap
  (code, rand) => {
    const m = pickMatch(code, /\+\+|--|(?<![+\-=<>!*/])\+(?![+=])|(?<![+\-=<>!*/])-(?![-=>])/g, rand);
    if (!m) return null;
    const swap: Record<string, string> = { '++': '--', '--': '++', '+': '-', '-': '+' };
    return splice(code, m.index, m[0].length, swap[m[0]]);
  },
  // integer literal ±1
  (code, rand) => {
    const m = pickMatch(code, /\b\d+\b/g, rand);
    if (!m) return null;
    const n = parseInt(m[0], 10);
    const next = n === 0 ? 1 : rand() < 0.5 ? n + 1 : Math.max(0, n - 1);
    if (next === n) return null;
    return splice(code, m.index, m[0].length, String(next));
  },
  // identifier swap (within the piece, or harvested from a sibling piece)
  (code, rand, siblings) => {
    const spans = quotedSpans(code);
    const counts = new Map<string, { n: number; first: number }>();
    const re = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      if (KEYWORDS.has(m[0]) || inSpans(m.index, spans)) continue;
      const e = counts.get(m[0]);
      if (e) e.n++;
      else counts.set(m[0], { n: 1, first: m.index });
    }
    const idents = [...counts.entries()].sort((a, b) => b[1].n - a[1].n).map(([w]) => w);
    if (idents.length === 0) return null;
    const target = idents[Math.floor(rand() * Math.min(idents.length, 3))];
    const pool = idents.filter((w) => w !== target && w.length <= target.length + 4);
    const harvested = siblings
      .flatMap((s) => s.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) ?? [])
      .filter((w) => !KEYWORDS.has(w) && w !== target && !counts.has(w) && w.length <= 8);
    const replacement =
      pool.length > 0 && rand() < 0.6
        ? pool[Math.floor(rand() * pool.length)]
        : harvested.length > 0
          ? harvested[Math.floor(rand() * harvested.length)]
          : pool[0];
    if (!replacement) return null;
    const occ = pickMatch(code, new RegExp(`\\b${target}\\b`, 'g'), rand);
    return occ ? splice(code, occ.index, occ[0].length, replacement) : null;
  },
  // boolean / negation toggle
  (code, rand) => {
    const m = pickMatch(code, /\btrue\b|\bfalse\b|\bTrue\b|\bFalse\b/g, rand);
    if (!m) return null;
    const swap: Record<string, string> = { true: 'false', false: 'true', True: 'False', False: 'True' };
    return splice(code, m.index, m[0].length, swap[m[0]]);
  },
  // adjacent interior-line swap (multi-line pieces only)
  (code, rand) => {
    const lines = code.split('\n');
    if (lines.length < 3) return null;
    const i = 1 + Math.floor(rand() * (lines.length - 2));
    const j = i === lines.length - 2 ? i - 1 : i + 1;
    if (i === j || lines[i].trim() === lines[j].trim()) return null;
    const n = lines.slice();
    [n[i], n[j]] = [n[j], n[i]];
    return n.join('\n');
  },
];

/**
 * One plausible mutant of `code`, or null when nothing safe applies.
 * `exclude` are outputs to avoid (previous mutants AND every real piece's code,
 * so a lie can never be indistinguishable from a truth).
 */
export function mutateCode(code: string, seed: number, exclude: Set<string>, siblings: string[] = []): string | null {
  const rand = mulberry32(seed);
  for (const mutate of seededShuffle(mutators, rand)) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const out = mutate(code, rand, siblings);
      if (out && out !== code && !exclude.has(out)) return out;
    }
  }
  return null;
}

/* -------------------------------- token diff ------------------------------ */

export interface DiffToken {
  text: string;
  changed: boolean;
}

/** Whitespace-token diff via jsdiff; whitespace runs are emitted unchanged. */
export function diffTokens(a: string, b: string): { a: DiffToken[]; b: DiffToken[] } {
  const split = (s: string) => s.split(/(\s+)/).filter((t) => t.length > 0);
  const at = split(a);
  const bt = split(b);
  const isWs = (t: string) => /^\s+$/.test(t);
  const an = at.filter((t) => !isWs(t));
  const bn = bt.filter((t) => !isWs(t));
  const changes = diffArrays(an, bn);

  const changedA = new Set<number>();
  const changedB = new Set<number>();
  let ai = 0;
  let bi = 0;
  for (const change of changes) {
    const count = change.value.length;
    if (change.removed && !change.added) {
      for (let i = 0; i < count; i++) changedA.add(ai++);
    } else if (change.added && !change.removed) {
      for (let i = 0; i < count; i++) changedB.add(bi++);
    } else if (change.removed && change.added) {
      for (let i = 0; i < count; i++) {
        changedA.add(ai++);
        changedB.add(bi++);
      }
    } else {
      ai += count;
      bi += count;
    }
  }

  const mark = (tokens: string[], changed: Set<number>): DiffToken[] => {
    let k = 0;
    return tokens.map((t) =>
      isWs(t) ? { text: t, changed: false } : { text: t, changed: changed.has(k++) },
    );
  };
  return { a: mark(at, changedA), b: mark(bt, changedB) };
}

/* ----------------------------- velocity tracker --------------------------- */

export interface VelocityTracker {
  push(x: number, t: number): void;
  /** px/ms over the trailing window; 0 with fewer than 2 samples. */
  velocity(): number;
  reset(): void;
}

export function createVelocityTracker(windowMs = 80): VelocityTracker {
  let samples: { x: number; t: number }[] = [];
  return {
    push(x, t) {
      samples.push({ x, t });
      if (samples.length > 5) samples.shift();
    },
    velocity() {
      if (samples.length < 2) return 0;
      const last = samples[samples.length - 1];
      let first = samples[0];
      for (const s of samples) {
        if (last.t - s.t <= windowMs) {
          first = s;
          break;
        }
      }
      const dt = last.t - first.t;
      return dt > 0 ? (last.x - first.x) / dt : 0;
    },
    reset() {
      samples = [];
    },
  };
}

/* ------------------------------- persistence ------------------------------ */

/** Session-only fallback when a host provides no stats adapter. */
export function memoryStatsStore(): AssembleGameStatsStore {
  const blobs = new Map<string, object>();
  return {
    read<T extends object>(gameId: string, fallback: T): T {
      return { ...fallback, ...(blobs.get(gameId) as Partial<T> | undefined) };
    },
    write(gameId: string, value: object) {
      blobs.set(gameId, value);
    },
  };
}

/* --------------------------------- misc ----------------------------------- */

export function formatSecs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** First non-empty line, trimmed — the tile/card cue for a piece. */
export function pieceFirstLine(code: string): string {
  return (code.split('\n').find((l) => l.trim()) ?? '').trim();
}
