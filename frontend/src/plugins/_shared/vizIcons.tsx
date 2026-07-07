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

/** Filesystem / trie root. */
export function IconFileTree() {
  return (
    <Glyph>
      <path d="M3 3.5h3l1 1.5h4.5v5.5H3z" />
      <path d="M5 7.5h5" />
    </Glyph>
  );
}

/** Path / directory walk. */
export function IconPath() {
  return (
    <Glyph>
      <path d="M2.5 6h2.5l1-1.5H9.5" />
      <circle cx="9.5" cy="6" r="0.8" fill="currentColor" stroke="none" />
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

/** Key-value map / set. */
export function IconMap() {
  return (
    <Glyph>
      <rect x="2.5" y="2.5" width="7" height="7" rx="1" />
      <path d="M5 5h4M5 7h2.5" />
    </Glyph>
  );
}

/** Tree branch — default root marker for rail section labels. */
export function IconBranch() {
  return (
    <Glyph>
      <path d="M4 2.5v7M4 6h4.5" />
    </Glyph>
  );
}

/** FIFO queue — horizontal lanes with dequeue cue. */
export function IconQueue() {
  return (
    <Glyph>
      <path d="M2 4h8M2 6.5h8M2 9h5" />
      <path d="M9.5 8.5v1.5l1.5-2-1.5-2v1.5" />
    </Glyph>
  );
}

/** LIFO stack — layered plates. */
export function IconStack() {
  return (
    <Glyph>
      <rect x="2.5" y="2.5" width="7" height="2" rx="0.5" />
      <rect x="3" y="5" width="6" height="2" rx="0.5" />
      <rect x="3.5" y="7.5" width="5" height="2" rx="0.5" />
    </Glyph>
  );
}

/** Ordered sequence — dotted index + lines. */
export function IconOrder() {
  return (
    <Glyph>
      <path d="M5 3h5M5 6h5M5 9h5" />
      <circle cx="3" cy="3" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="3" cy="6" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="3" cy="9" r="0.7" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

/** Active / current focus — crosshair target. */
export function IconFocus() {
  return (
    <Glyph>
      <circle cx="6" cy="6" r="3.5" />
      <circle cx="6" cy="6" r="1.2" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

/** Final answer — flag at the finish line. */
export function IconFlag() {
  return (
    <Glyph>
      <path d="M3.5 2.5v7" />
      <path d="M3.5 3h4.5l-1 1.5 1 1.5H3.5" />
    </Glyph>
  );
}

/** Algorithm phase roadmap — linked milestones. */
export function IconPhase() {
  return (
    <Glyph>
      <circle cx="3" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="6" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <path d="M4.2 6h1.6M7.2 6h1.6" />
    </Glyph>
  );
}

/** Semantic color bucket for a rail root icon. */
export type RailRootTone = 'accent' | 'good' | 'warn' | 'bad';

/** Pick a tone that matches the section's role in the algorithm. */
export function resolveRailRootTone(label: ReactNode): RailRootTone {
  const key = typeof label === 'string' ? label.toLowerCase().trim() : '';
  if (!key) return 'accent';
  if (
    /^answer$|^result$|order|output|^out$|traversal|layers|columns|tokens|links|answers|medians/.test(
      key,
    )
  ) {
    return 'good';
  }
  if (/^phase$|steps|stack/.test(key)) return 'warn';
  return 'accent';
}

/** Pick a meaningful 12×12 glyph for a rail section root label. */
export function resolveRailRootIcon(label: ReactNode): ReactNode {
  const key = typeof label === 'string' ? label.toLowerCase().trim() : '';
  if (!key) return <IconBranch />;
  if (/^op$|command|cmd/.test(key)) return <IconSpark />;
  if (/^path$|cwd|walk/.test(key)) return <IconPath />;
  if (/^fs$|file|tree|nodes|trie/.test(key)) return <IconFileTree />;
  if (/queue|frontier/.test(key)) return <IconQueue />;
  if (/stack/.test(key)) return <IconStack />;
  if (/^answer$|^result$/.test(key)) return <IconFlag />;
  if (/^phase$|steps/.test(key)) return <IconPhase />;
  if (
    /order|output|^out$|traversal|layers|columns|tokens|links|answers|medians|listing|ls/.test(key)
  ) {
    return <IconOrder />;
  }
  if (/active|scan|progress|pointer|current|cell|window|inputs|strings|best|visit/.test(key)) {
    return <IconFocus />;
  }
  if (/map|seen|freq|count|prefix/.test(key)) return <IconMap />;
  return <IconBranch />;
}
