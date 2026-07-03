import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/utils/cn';
import { nodeText, RADIUS_CTRL } from '@/design/typography';
import {
  VIZ_FIT_PAD,
  VIZ_MEASURE_SELECTOR,
  computeVizFitLayout,
  resolveMeasureSize,
} from '@/lib/canvas/vizFitMeasure';

/**
 * Auto-scaling viz container: measures its board content and downscales it to
 * fit the flex slot (or hug-wraps to the scaled size). Depends only on the pure
 * fit math in lib/canvas/vizFitMeasure, so it lives in the shared components
 * leaf — both canvas panels (shell) and plugin views can consume it. `nodeui`
 * re-exports it for its existing shell/canvas consumers.
 */
export function VizFitBox({
  children,
  className,
  remeasureKey,
  layout: layoutMode = 'fill',
  measureRef,
}: {
  children: ReactNode;
  className?: string;
  /** Bumps remeasure when viz frame/step changes. */
  remeasureKey?: string | number;
  /** `fill` expands to the flex slot; `hug` shrink-wraps to scaled board size. */
  layout?: 'fill' | 'hug';
  /** Flex-area element used for fit math when `layout="hug"`. */
  measureRef?: RefObject<HTMLElement | null>;
}) {
  const selfRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ scale: 1, w: 0, h: 0, nw: 0, nh: 0 });
  const hug = layoutMode === 'hug';

  useLayoutEffect(() => {
    const measureEl = hug && measureRef?.current ? measureRef.current : selfRef.current;
    const content = contentRef.current;
    if (!measureEl || !content) return;

    const measureTarget = () => {
      const board = content.querySelector<HTMLElement>('.board-area');
      if (board) return board;
      const matched = content.querySelector<HTMLElement>(VIZ_MEASURE_SELECTOR);
      if (matched) return matched;
      return content;
    };

    const sync = () => {
      const cw = measureEl.clientWidth;
      // In `hug` the node auto-heights to this box, so reading the parent's
      // clientHeight would feed back into the scale (runaway shrink). Bind the
      // fit to width and cap by the viewport so tall boards still fit.
      const ch = hug ? Math.max(1, window.innerHeight - VIZ_FIT_PAD * 2) : measureEl.clientHeight;
      if (cw === 0 || ch === 0) {
        requestAnimationFrame(sync);
        return;
      }

      const target = measureTarget();
      const { w: nw, h: nh, boxH } = resolveMeasureSize(target, cw);
      if (nw === 0 || nh === 0) {
        requestAnimationFrame(sync);
        return;
      }

      // Scale is derived from the main animation height (`nh`); the box is sized
      // to the full stage (`boxH`) so a growing rail extends the box downward
      // without ever rescaling the board.
      const fit = computeVizFitLayout(nw, nh, cw, ch);
      setLayout({ scale: fit.scale, w: fit.w, h: boxH * fit.scale, nw, nh: boxH });
    };

    const ro = new ResizeObserver(() => requestAnimationFrame(sync));
    ro.observe(measureEl);
    ro.observe(content);
    sync();
    return () => ro.disconnect();
  }, [children, remeasureKey, hug, measureRef]);

  const scaled = layout.scale !== 1 && layout.nw > 0 && layout.nh > 0;
  const hugSize =
    hug && layout.w > 0 && layout.h > 0
      ? { width: layout.w + VIZ_FIT_PAD * 2, height: layout.h + VIZ_FIT_PAD * 2, maxWidth: '100%' }
      : undefined;

  return (
    <div
      ref={selfRef}
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        hug ? 'viz-board-col--hug shrink-0' : 'min-h-0 flex-1',
        className,
      )}
      style={hugSize}
    >
      <div
        style={{
          width: layout.w || undefined,
          height: layout.h || undefined,
          overflow: scaled ? 'hidden' : undefined,
          flexShrink: 0,
        }}
      >
        <div
          ref={contentRef}
          style={{
            width: scaled ? layout.nw : undefined,
            height: scaled ? layout.nh : undefined,
            transform: scaled ? `scale(${layout.scale})` : undefined,
            transformOrigin: '0 0',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Compact segmented control (mono label, active pill) for in-node tabs. */
export function MiniTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="nodrag inline-flex items-center gap-0.5 rounded-lg bg-panel2 p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            cn(RADIUS_CTRL, 'px-2 py-1 font-medium transition-colors', nodeText.sm),
            value === o.v ? 'bg-panel text-ink shadow-[var(--shadow-sm)]' : 'text-ink3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
