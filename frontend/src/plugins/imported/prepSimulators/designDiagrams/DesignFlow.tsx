import type { CSSProperties, ReactElement } from 'react';
import { cn } from '@/lib/utils/cn';
import { vizText } from '@/plugins/_shared/vizKit';
import type { DesignDiagramSpec, DiagramNode, DiagramNodeKind } from './types';

const COL_W = 188;
const ROW_H = 112;
const PAD = 24;
const GAP_X = 30;
const GAP_Y = 34;
const LINE_H = 15;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

function nodeRect(n: DiagramNode): Rect {
  const span = n.w ?? 1;
  const x = PAD + n.col * COL_W;
  const y = PAD + n.row * ROW_H;
  const w = span * COL_W - GAP_X;
  const lineCount = n.lines?.length ?? 0;
  const h = Math.min(ROW_H - 16, Math.max(ROW_H - GAP_Y, 40 + (1 + lineCount) * LINE_H));
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

export function DesignFlow({ spec }: { spec: DesignDiagramSpec }) {
  const rects = new Map<string, Rect>();
  for (const n of spec.nodes) rects.set(n.id, nodeRect(n));

  let maxRight = 0;
  let maxBottom = 0;
  for (const r of rects.values()) {
    maxRight = Math.max(maxRight, r.x + r.w);
    maxBottom = Math.max(maxBottom, r.y + r.h);
  }
  const width = maxRight + PAD;
  const height = maxBottom + PAD;

  const edgeEls: ReactElement[] = [];
  spec.edges.forEach((e, i) => {
    const a = rects.get(e.from);
    const b = rects.get(e.to);
    if (!a || !b) return;
    const [x1, y1] = borderPoint(a, b.cx, b.cy);
    const [x2raw, y2raw] = borderPoint(b, a.cx, a.cy);
    // Trim the target end so the arrowhead sits just off the box edge.
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
        strokeLinecap="round"
        strokeDasharray={e.dashed ? '5 4' : undefined}
        markerEnd="url(#df-arrow)"
        markerStart={e.bidir ? 'url(#df-arrow)' : undefined}
      />,
    );
    if (e.label) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const w = e.label.length * 6.2 + 10;
      edgeEls.push(
        <g key={`el${i}`}>
          <rect
            x={mx - w / 2}
            y={my - 9}
            width={w}
            height={18}
            rx={4}
            fill="var(--panel)"
            stroke="var(--edge)"
            strokeWidth={1}
          />
          <text
            x={mx}
            y={my + 4}
            textAnchor="middle"
            style={{ fill: 'var(--text-2)', font: '500 10px var(--sans)' }}
          >
            {e.label}
          </text>
        </g>,
      );
    }
  });

  const nodeEls = spec.nodes.map((n) => {
    const r = rects.get(n.id)!;
    const style = KIND_STYLE[n.kind ?? 'store'];
    const titleY = n.lines?.length ? r.y + 20 : r.cy + 4;
    return (
      <g key={n.id}>
        <rect
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          rx={10}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={n.kind === 'op' ? 1.75 : 1.25}
          strokeDasharray={style.dashed ? '5 4' : undefined}
        />
        <text
          x={r.cx}
          y={titleY}
          textAnchor="middle"
          style={{ fill: 'var(--text)', font: '600 12px var(--sans)' }}
        >
          {n.label}
        </text>
        {n.lines?.map((line, li) => (
          <text
            key={li}
            x={r.cx}
            y={r.y + 20 + (li + 1) * LINE_H}
            textAnchor="middle"
            style={{ fill: 'var(--text-2)', font: '400 10px var(--mono, ui-monospace)' }}
          >
            {line}
          </text>
        ))}
      </g>
    );
  });

  const svgStyle: CSSProperties = { maxWidth: '100%' };

  return (
    <div className="board-area design-flow">
      {spec.title && <div className={cn(vizText.sm, 'font-semibold text-ink')}>{spec.title}</div>}
      {spec.caption && <div className={cn(vizText.sm, 'text-ink3')}>{spec.caption}</div>}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={spec.title ? `${spec.title} design diagram` : 'design diagram'}
        style={svgStyle}
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
      </svg>
      {spec.legend && spec.legend.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {spec.legend.map((l) => (
            <span
              key={l}
              className="rounded-full border border-edge/70 bg-panel2/60 px-2 py-0.5 text-[length:var(--fs-tight)] text-ink3"
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
