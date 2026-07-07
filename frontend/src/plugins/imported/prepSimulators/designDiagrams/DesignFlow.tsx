import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { cn } from '@/lib/utils/cn';
import { vizText } from '@/plugins/_shared/vizKit';
import type { DesignDiagramSpec, DiagramNode, DiagramNodeKind, DiagramPage } from './types';

const PAD = 24;
const GAP_X = 44;
const GAP_Y = 40;
const LINE_H = 16;
/* Clamp cell size so few-box diagrams don't balloon into blurry giants; the grid
   is centered in any leftover space so it still reads as "filling" the area. */
const MAX_COL_W = 340;
const MAX_ROW_H = 240;
const MIN_COL_W = 150;
const MIN_ROW_H = 92;
/* Fallback area when the container hasn't been measured yet (jsdom / first paint). */
const FALLBACK_W = 680;
const FALLBACK_H = 380;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

interface Grid {
  colUnit: number;
  rowUnit: number;
  offsetX: number;
  offsetY: number;
}

/** Distribute the node grid across the measured area, clamped and centered. */
function computeGrid(page: DiagramPage, W: number, H: number): Grid {
  let cols = 1;
  let rows = 1;
  for (const n of page.nodes) {
    cols = Math.max(cols, n.col + (n.w ?? 1));
    rows = Math.max(rows, n.row + 1);
  }
  const availW = Math.max(1, W - PAD * 2);
  const availH = Math.max(1, H - PAD * 2);
  const colUnit = Math.min(MAX_COL_W, Math.max(MIN_COL_W, availW / cols));
  const rowUnit = Math.min(MAX_ROW_H, Math.max(MIN_ROW_H, availH / rows));
  const gridW = colUnit * cols;
  const gridH = rowUnit * rows;
  const offsetX = Math.max(0, (W - gridW) / 2);
  const offsetY = Math.max(0, (H - gridH) / 2);
  return { colUnit, rowUnit, offsetX, offsetY };
}

function nodeRect(n: DiagramNode, g: Grid): Rect {
  const span = n.w ?? 1;
  const x = g.offsetX + n.col * g.colUnit + GAP_X / 2;
  const y = g.offsetY + n.row * g.rowUnit + GAP_Y / 2;
  const w = span * g.colUnit - GAP_X;
  const h = g.rowUnit - GAP_Y;
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

/** Point where the center→center segment crosses `rect`'s border. */
function borderPoint(rect: Rect, towardX: number, towardY: number): [number, number] {
  const dx = towardX - rect.cx;
  const dy = towardY - rect.cy;
  if (dx === 0 && dy === 0) return [rect.cx, rect.cy];
  const hx = rect.w / 2;
  const hy = rect.h / 2;
  const tx = dx !== 0 ? hx / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? hy / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  return [rect.cx + dx * t, rect.cy + dy * t];
}

const KIND_STYLE: Record<DiagramNodeKind, { fill: string; stroke: string; dashed?: boolean }> = {
  store: { fill: 'color-mix(in srgb, var(--text) 6%, var(--panel))', stroke: 'var(--edge)' },
  op: { fill: 'color-mix(in srgb, var(--accent) 16%, var(--panel))', stroke: 'var(--accent)' },
  io: { fill: 'var(--panel)', stroke: 'var(--edge)' },
  note: { fill: 'transparent', stroke: 'var(--edge)', dashed: true },
};

function PageSvg({ page, W, H }: { page: DiagramPage; W: number; H: number }) {
  const grid = computeGrid(page, W, H);
  const rects = new Map<string, Rect>();
  for (const n of page.nodes) rects.set(n.id, nodeRect(n, grid));

  const edgeEls: ReactElement[] = [];
  const labelEls: ReactElement[] = [];
  page.edges.forEach((e, i) => {
    const a = rects.get(e.from);
    const b = rects.get(e.to);
    if (!a || !b) return;
    const [x1, y1] = borderPoint(a, b.cx, b.cy);
    const [x2raw, y2raw] = borderPoint(b, a.cx, a.cy);
    const dx = x2raw - x1;
    const dy = y2raw - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const x2 = x2raw - ux * 7;
    const y2 = y2raw - uy * 7;
    const sx = e.bidir ? x1 + ux * 7 : x1;
    const sy = e.bidir ? y1 + uy * 7 : y1;

    edgeEls.push(
      <line
        key={`e${i}`}
        x1={sx}
        y1={sy}
        x2={x2}
        y2={y2}
        stroke="var(--edge)"
        strokeWidth={1.5}
        strokeLinecap="square"
        strokeDasharray={e.dashed ? '5 4' : undefined}
        markerEnd="url(#df-arrow)"
        markerStart={e.bidir ? 'url(#df-arrow)' : undefined}
      />,
    );

    if (e.label) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const w = e.label.length * 6.4 + 12;
      labelEls.push(
        <g key={`el${i}`}>
          <rect
            x={mx - w / 2}
            y={my - 10}
            width={w}
            height={20}
            rx={5}
            fill="var(--panel)"
            stroke="var(--edge)"
            strokeWidth={1}
          />
          <text
            x={mx}
            y={my + 4}
            textAnchor="middle"
            style={{ fill: 'var(--text-2)', font: '500 11px var(--sans)' }}
          >
            {e.label}
          </text>
        </g>,
      );
    }
  });

  const nodeEls = page.nodes.map((n) => {
    const r = rects.get(n.id)!;
    const style = KIND_STYLE[n.kind ?? 'store'];
    const lineCount = n.lines?.length ?? 0;
    const blockH = 18 + lineCount * LINE_H;
    const titleY = lineCount ? r.cy - blockH / 2 + 14 : r.cy + 5;
    return (
      <g key={n.id}>
        <rect
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          rx={8}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={n.kind === 'op' ? 1.75 : 1.25}
          strokeDasharray={style.dashed ? '5 4' : undefined}
        />
        <text
          x={r.cx}
          y={titleY}
          textAnchor="middle"
          style={{ fill: 'var(--text)', font: '600 13px var(--sans)' }}
        >
          {n.label}
        </text>
        {n.lines?.map((line, li) => (
          <text
            key={li}
            x={r.cx}
            y={titleY + (li + 1) * LINE_H}
            textAnchor="middle"
            style={{ fill: 'var(--text-2)', font: '400 11px var(--mono, ui-monospace)' }}
          >
            {line}
          </text>
        ))}
      </g>
    );
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={page.tab}
      className="design-flow__svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker
          id="df-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--edge)" />
        </marker>
      </defs>
      {edgeEls}
      {nodeEls}
      {labelEls}
    </svg>
  );
}

export function DesignFlow({ spec }: { spec: DesignDiagramSpec }) {
  const [pageIdx, setPageIdx] = useState(0);
  const diagramRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: FALLBACK_W, h: FALLBACK_H });
  const pages = spec.pages ?? [];

  // Measure the diagram area so the grid can fill both dimensions. A ResizeObserver
  // keeps it in sync with panel resizes and tab-driven layout changes.
  useLayoutEffect(() => {
    const el = diagramRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (pages.length === 0) {
    return (
      <div className="board-area design-flow flex flex-col gap-1">
        {spec.title && <div className={cn(vizText.sm, 'font-semibold text-ink')}>{spec.title}</div>}
        <div className={cn(vizText.sm, 'text-ink3')}>No diagram pages configured.</div>
      </div>
    );
  }
  const page = pages[Math.min(pageIdx, pages.length - 1)]!;
  const multiPage = pages.length > 1;

  return (
    <div className="board-area design-flow" data-design-page={pageIdx}>
      <div className="design-flow__chrome">
        {spec.title && <div className={cn(vizText.sm, 'font-semibold text-ink')}>{spec.title}</div>}
        {page.caption && <div className={cn(vizText.sm, 'text-ink3')}>{page.caption}</div>}
      </div>

      <div ref={diagramRef} className="design-flow__diagram">
        <PageSvg key={page.tab} page={page} W={size.w} H={size.h} />
      </div>

      <div className="design-flow__footer">
        {page.legend && page.legend.length > 0 && (
          <div className="design-flow__legend flex flex-wrap gap-1.5">
            {page.legend.map((l) => (
              <span
                key={l}
                className="border border-edge/70 bg-panel2/60 px-2 py-0.5 text-[length:var(--fs-tight)] text-ink3"
              >
                {l}
              </span>
            ))}
          </div>
        )}

        {multiPage && (
          <div
            role="tablist"
            aria-label="Diagram variants"
            className="design-flow__tabs flex gap-1 border-t border-edge/60 pt-1.5"
          >
            {pages.map((p, i) => (
              <button
                key={p.tab}
                type="button"
                role="tab"
                aria-selected={i === pageIdx}
                onClick={() => setPageIdx(i)}
                className={cn(
                  'design-flow-tab px-3 py-1 text-[length:var(--fs-tight)] font-medium transition-colors',
                  i === pageIdx
                    ? 'border border-accent/30 bg-accent/10 text-accent'
                    : 'border border-transparent text-ink3 hover:border-edge hover:text-ink',
                )}
              >
                {p.tab}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
