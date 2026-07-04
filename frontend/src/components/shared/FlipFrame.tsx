import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** Skip morphing on boards too dense for per-element animation to read. */
const MAX_FLIP_ELS = 400;
const FLIP_EASE = 'transform 0.24s cubic-bezier(0.2, 0.7, 0.3, 1)';

type Pt = { left: number; top: number };

/**
 * FLIP layer for the frame player: when `frameKey` advances, descendants
 * carrying `data-flip` (a stable value identity, see board/flipKeys) slide
 * from where that identity sat last frame to where it sits now, instead of
 * teleporting. Positions are tracked by key — index-keyed React boards keep
 * their DOM in place while values move between cells, and this is exactly
 * the movement being animated.
 *
 * Coordinates are stored root-relative and divided by the current render
 * scale, so scrolling and VizFitBox rescales between frames don't register
 * as movement. Reduced motion is neutralized by the global override.
 */
export function FlipFrame({
  frameKey,
  resetKey,
  className,
  children,
}: {
  /** Bump per frame (player.index). */
  frameKey: string | number;
  /** Bump when the board identity changes (plugin/input) to forget positions. */
  resetKey?: string | number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rects = useRef(new Map<string, Pt>());
  const prevReset = useRef(resetKey);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (prevReset.current !== resetKey) {
      prevReset.current = resetKey;
      rects.current.clear();
    }
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-flip]'));
    if (els.length === 0 || els.length > MAX_FLIP_ELS) {
      rects.current.clear();
      return;
    }

    // Neutralize any in-flight slide so measurements are natural positions.
    // (Inline transition/transform on [data-flip] elements is owned by us.)
    let cleared = false;
    for (const el of els) {
      if (el.style.transform || el.style.transition) {
        el.style.transition = 'none';
        el.style.transform = '';
        cleared = true;
      }
    }
    if (cleared) void root.offsetWidth;

    const rootRect = root.getBoundingClientRect();
    const scale = root.offsetWidth > 0 ? rootRect.width / root.offsetWidth : 1;
    const prev = rects.current;
    const next = new Map<string, Pt>();
    const moves: { el: HTMLElement; dx: number; dy: number }[] = [];
    for (const el of els) {
      const key = el.dataset.flip;
      if (!key || next.has(key)) continue;
      const r = el.getBoundingClientRect();
      const pos = { left: (r.left - rootRect.left) / scale, top: (r.top - rootRect.top) / scale };
      next.set(key, pos);
      const old = prev.get(key);
      if (!old) continue;
      const dx = old.left - pos.left;
      const dy = old.top - pos.top;
      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) moves.push({ el, dx, dy });
    }
    rects.current = next;
    // Restore every element to stylesheet transitions; movers get their
    // inverted transform under 'none' below. Leaving 'none' behind would
    // permanently kill the tone-ease on previously-moved cells.
    if (cleared) for (const el of els) el.style.transition = '';
    if (moves.length === 0) return;

    let settle: ReturnType<typeof setTimeout> | undefined;
    let raf = 0;
    let backup: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      for (const m of moves) {
        m.el.style.transition = FLIP_EASE;
        m.el.style.transform = '';
      }
      // Drop the inline transition once settled — it must not keep overriding
      // the stylesheet tone transitions between frames.
      settle = setTimeout(() => {
        for (const m of moves) m.el.style.transition = '';
      }, 300);
    };
    // Apply the inverted start transforms in a microtask: after every layout
    // effect in this commit (VizFitBox measures a transform-free board — a
    // translated mover would inflate its scrollWidth), yet still before paint.
    queueMicrotask(() => {
      if (cancelled) return;
      for (const m of moves) {
        m.el.style.transition = 'none';
        m.el.style.transform = `translate(${m.dx}px, ${m.dy}px)`;
      }
      void root.offsetWidth;
      // rAF plays on the next visible frame; the timeout backs it up so movers
      // never freeze at their start offsets while the tab is hidden.
      raf = requestAnimationFrame(play);
      backup = setTimeout(play, 120);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (backup) clearTimeout(backup);
      if (settle) clearTimeout(settle);
    };
  }, [frameKey, resetKey]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
