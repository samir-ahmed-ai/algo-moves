/**
 * Tiny inline icons for rail / stat-strip labels — 12×12 grid, stroke and
 * fill follow `currentColor` so the surrounding tone classes color them.
 * Keep each glyph meaningful (it should explain the stat, not decorate it).
 */
import type { ReactNode } from 'react';

function Glyph({ children, filled = false }: { children: ReactNode; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Expected value range `[· ·]` — brackets around a compact domain. */
export function IconRange() {
  return (
    <Glyph>
      <path d="M4 2.5H2.5v7H4M8 2.5h1.5v7H8" />
      <circle cx="5.1" cy="6" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="6.9" cy="6" r="0.5" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

/** XOR — the ⊕ operator. */
export function IconXor() {
  return (
    <Glyph>
      <circle cx="6" cy="6" r="4.4" />
      <path d="M6 3.4v5.2M3.4 6h5.2" />
    </Glyph>
  );
}

/** Isolated bit — crosshair target on the one differing bit. */
export function IconBit() {
  return (
    <Glyph>
      <circle cx="6" cy="6" r="4" />
      <circle cx="6" cy="6" r="1.2" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

/** Bucket — values get routed into one of two of these. */
export function IconBucket() {
  return (
    <Glyph>
      <path d="M2.5 3.5h7M3.2 3.5l1 6h3.6l1-6" />
    </Glyph>
  );
}

/** Current operation — a spark for the op being applied this frame. */
export function IconSpark() {
  return (
    <Glyph filled>
      <path d="M6.8 1.5 3.4 6.7h2.2L5.2 10.5 8.6 5.3H6.4Z" />
    </Glyph>
  );
}

/** Duplicate — two overlapping cells. */
export function IconDup() {
  return (
    <Glyph>
      <rect x="2" y="2" width="5.5" height="5.5" rx="1" />
      <rect x="4.5" y="4.5" width="5.5" height="5.5" rx="1" />
    </Glyph>
  );
}

/** Missing — the ghost of a cell that should have been there. */
export function IconGhost() {
  return (
    <Glyph>
      <rect x="2.5" y="2.5" width="7" height="7" rx="1.5" strokeDasharray="2 1.7" />
    </Glyph>
  );
}
