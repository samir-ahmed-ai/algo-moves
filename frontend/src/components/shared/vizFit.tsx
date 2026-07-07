import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
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
  readonly children: ReactNode;
  readonly className?: string;
  /** Bumps remeasure when viz frame/step changes. */
  readonly remeasureKey?: string | number;
  /** `fill` expands to the flex slot; `hug` shrink-wraps to scaled board size. */
  readonly layout?: 'fill' | 'hug';
  /** Flex-area element used for fit math when `layout="hug"`. */
  readonly measureRef?: RefObject<HTMLElement | null>;
}) {
  const selfRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ scale: 1, w: 0, h: 0, nw: 0, nh: 0, fillH: 0 });
  // Ease size/scale changes only after the first painted layout, so mount
  // doesn't animate in from zero.
  const [animReady, setAnimReady] = useState(false);
  const lastMeasureW = useRef(0);
  const syncRef = useRef<(() => void) | null>(null);
  const hug = layoutMode === 'hug';

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useLayoutEffect(() => {
    const measureEl = hug && measureRef?.current ? measureRef.current : selfRef.current;
    const content = contentRef.current;
    if (!measureEl || !content) return;
    if (typeof ResizeObserver === 'undefined') return;

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
      const fitH = hug ? nh : boxH;
      const fit = computeVizFitLayout(nw, fitH, cw, ch);
      lastMeasureW.current = cw;
      // Staged boards (main animation + side rail) stretch to the full panel
      // height so the rail column and its divider reach the bottom instead of
      // hugging the short main-animation height and clipping the rail's stack.
      const isStage = !hug && target.classList.contains('viz-stage');
      const fillH = isStage ? Math.max(1, ch - VIZ_FIT_PAD * 2) : 0;
      const next = { scale: fit.scale, w: fit.w, h: fit.h, nw, nh: boxH, fillH };
      // Bail on identical values: the eased box resize re-fires the observer
      // for ~13 frames per step, and each converged tick must not re-render.
      setLayout((prev) =>
        prev.scale === next.scale &&
        prev.w === next.w &&
        prev.h === next.h &&
        prev.nw === next.nw &&
        prev.nh === next.nh &&
        prev.fillH === next.fillH
          ? prev
          : next,
      );
    };

    syncRef.current = sync;
    sync();

    const onRemeasure = () => requestAnimationFrame(sync);
    content.addEventListener('vizfit:remeasure', onRemeasure);

    return () => {
      content.removeEventListener('vizfit:remeasure', onRemeasure);
    };
  }, [children, remeasureKey, hug, measureRef]);

  // Persistent observer — created once per (hug, measureRef), NOT per frame.
  // Re-observing every step would deliver the spec-mandated initial
  // notification one rendered frame later, mid-FLIP, where translated movers
  // inflate scrollWidth and jitter the fit. RO ignores transforms, so with a
  // stable observation a pure position-morph step fires nothing.
  useLayoutEffect(() => {
    const measureEl = hug && measureRef?.current ? measureRef.current : selfRef.current;
    const content = contentRef.current;
    if (!measureEl || !content) return;
    const ro = new ResizeObserver((entries) => {
      // In hug mode the measure parent's *height* follows our own eased box —
      // only width changes demand a re-fit, so ignore pure-height echoes.
      if (
        hug &&
        entries.every(
          (e) => e.target === measureEl && Math.round(e.contentRect.width) === lastMeasureW.current,
        )
      ) {
        return;
      }
      requestAnimationFrame(() => syncRef.current?.());
    });
    ro.observe(measureEl);
    ro.observe(content);
    return () => ro.disconnect();
  }, [hug, measureRef]);

  const scaled = layout.scale !== 1 && layout.nw > 0 && layout.nh > 0;
  // Staged fill: stretch the scaled content to the full panel height so the
  // rail reaches the bottom. Applies even at scale 1 (an exact-width fit).
  const stageFill = !hug && layout.fillH > 0 && layout.nw > 0;
  const sized = scaled || stageFill;
  const contentH = stageFill ? layout.fillH / layout.scale : scaled ? layout.nh : undefined;
  const stageH = stageFill ? layout.fillH : layout.h || undefined;
  const hugSize =
    hug && layout.w > 0 && layout.h > 0
      ? { width: layout.w + VIZ_FIT_PAD * 2, height: layout.h + VIZ_FIT_PAD * 2, maxWidth: '100%' }
      : undefined;

  return (
    <div
      data-layout={layoutMode}
      ref={selfRef}
      className={cn(
        'viz-fit-box relative flex items-center justify-center overflow-hidden',
        hug ? 'viz-board-col--hug shrink-0' : 'min-h-0 flex-1',
        hug ? 'viz-fit-box--hug' : 'viz-fit-box--fill',
        animReady && 'viz-fit-anim-size',
        className,
      )}
      style={hugSize}
    >
      <div
        className={cn('viz-fit-box__stage', animReady && 'viz-fit-anim-size')}
        style={{
          width: layout.w || undefined,
          height: stageH,
          overflow: sized ? 'hidden' : undefined,
          flexShrink: 0,
        }}
      >
        <div
          ref={contentRef}
          className={cn('viz-fit-box__content', animReady && 'viz-fit-anim-scale')}
          style={{
            width: sized ? layout.nw : undefined,
            height: contentH,
            transform: sized && layout.scale !== 1 ? `scale(${layout.scale})` : undefined,
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
  label = 'Options',
}: {
  readonly value: T;
  readonly options: readonly { readonly v: T; readonly label: ReactNode }[];
  readonly onChange: (v: T) => void;
  readonly label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="mini-tabs nodrag inline-flex items-center gap-0.5 rounded-lg bg-panel2 p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="tab"
          aria-selected={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            cn(RADIUS_CTRL, 'px-2 py-1 font-medium transition-colors', nodeText.sm),
            'mini-tabs__button',
            value === o.v
              ? 'mini-tabs__button--active bg-panel text-ink shadow-[var(--shadow-sm)]'
              : 'text-ink3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
