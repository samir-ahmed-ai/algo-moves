import type { Viewport } from '@xyflow/react';
import { CANVAS_MARGIN } from '../ui/canvasTokens';
import { layoutFixedWidth } from '../nodes/nodeTokens';
import type { PanelFlowNode } from '@/core/panelFlowTypes';

import type { CanvasFillPreset, CanvasSnapRegion } from '@/lib/canvas/layoutPrefs';

export type { CanvasFillPreset, CanvasSnapRegion };

export type FlowRect = { x: number; y: number; width: number; height: number };

/** Visible canvas area in flow coordinates. */
export function visibleFlowRect(
  viewport: Viewport,
  containerWidth: number,
  containerHeight: number,
  margin = CANVAS_MARGIN,
): FlowRect {
  const { x, y, zoom } = viewport;
  const left = (-x + margin) / zoom;
  const top = (-y + margin) / zoom;
  const right = (containerWidth - x - margin) / zoom;
  const bottom = (containerHeight - y - margin) / zoom;
  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/** Target bounds for a snap region within the visible canvas rect. */
export function regionRect(region: CanvasSnapRegion, visible: FlowRect): FlowRect {
  const { x, y, width, height } = visible;
  const halfW = width / 2;
  const halfH = height / 2;

  switch (region) {
    case 'left':
      return { x, y, width: halfW, height };
    case 'right':
      return { x: x + halfW, y, width: halfW, height };
    case 'top':
      return { x, y, width, height: halfH };
    case 'bottom':
      return { x, y: y + halfH, width, height: halfH };
    case 'top-left':
      return { x, y, width: halfW, height: halfH };
    case 'top-right':
      return { x: x + halfW, y, width: halfW, height: halfH };
    case 'bottom-left':
      return { x, y: y + halfH, width: halfW, height: halfH };
    case 'bottom-right':
      return { x: x + halfW, y: y + halfH, width: halfW, height: halfH };
    case 'center': {
      const cw = width * 0.6;
      const ch = height * 0.6;
      return { x: x + (width - cw) / 2, y: y + (height - ch) / 2, width: cw, height: ch };
    }
    case 'maximize':
      return { x, y, width, height };
    case 'first-third':
      return { x, y, width: width / 3, height };
    case 'center-third':
      return { x: x + width / 3, y, width: width / 3, height };
    case 'last-third':
      return { x: x + (2 * width) / 3, y, width: width / 3, height };
  }
}

function capWidth(kind: string, width: number): number {
  const maxW = layoutFixedWidth(kind);
  return maxW != null ? Math.min(width, maxW) : width;
}

/* ------------------------------------------------------------------ tiling */

export interface TileOptions {
  /** Gap between tiles and around the rect edge (flow units). */
  gutter?: number;
  /** Panel kind promoted to the primary (largest) tile. */
  primaryKind?: string;
  /** Fraction of the rect width the primary column takes (0.5–0.75). */
  primaryShare?: number;
}

/** Kinds that make good primary tiles, most preferred first. */
const TILE_PRIORITY = [
  'workbench',
  'whiteboard',
  'collab-code',
  'code',
  'viz',
  'scratch',
  'cases',
  'replay',
  'inspector',
  'problem',
  'predict',
  'explain',
  'notes',
];

const tilePriority = (kind: string): number => {
  const i = TILE_PRIORITY.indexOf(kind);
  return i === -1 ? TILE_PRIORITY.length : i;
};

/** Preset → tile options. 'auto' keeps priority order; others promote a kind. */
export function fillPresetOptions(preset: CanvasFillPreset): TileOptions {
  switch (preset) {
    case 'board':
      return { primaryKind: 'whiteboard', primaryShare: 0.66 };
    case 'code':
      return { primaryKind: 'collab-code', primaryShare: 0.66 };
    case 'split':
      return { primaryShare: 0.5 };
    default:
      return {};
  }
}

/** Order nodes for tiling: primary kind first, then by kind priority (stable). */
export function orderForTiling(nodes: PanelFlowNode[], primaryKind?: string): PanelFlowNode[] {
  return [...nodes].sort((a, b) => {
    const ka = a.data.kind ?? a.id;
    const kb = b.data.kind ?? b.id;
    if (primaryKind && ka !== kb) {
      if (ka === primaryKind) return -1;
      if (kb === primaryKind) return 1;
    }
    return tilePriority(ka) - tilePriority(kb);
  });
}

function splitColumn(rect: FlowRect, weights: number[], gutter: number): FlowRect[] {
  const innerH = rect.height - gutter * (weights.length - 1);
  const total = weights.reduce((s, w) => s + w, 0);
  let y = rect.y;
  return weights.map((w) => {
    const h = (innerH * w) / total;
    const cell = { x: rect.x, y, width: rect.width, height: h };
    y += h + gutter;
    return cell;
  });
}

function uniformGrid(count: number, rect: FlowRect, gutter: number): FlowRect[] {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const rowH = (rect.height - gutter * (rows - 1)) / rows;
  const cells: FlowRect[] = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, count - r * cols);
    const colW = (rect.width - gutter * (inRow - 1)) / inRow;
    for (let c = 0; c < inRow; c++) {
      cells.push({
        x: rect.x + c * (colW + gutter),
        y: rect.y + r * (rowH + gutter),
        width: colW,
        height: rowH,
      });
    }
  }
  return cells;
}

/** Cell rects for `count` tiles inside `rect`, primary-weighted up to 8 tiles. */
export function tileCells(
  count: number,
  rect: FlowRect,
  gutter: number,
  primaryShare: number,
): FlowRect[] {
  if (count <= 0) return [];
  if (count === 1) return [rect];

  const share = Math.min(0.75, Math.max(0.5, primaryShare));
  const primaryW = (rect.width - gutter) * share;
  const restW = rect.width - gutter - primaryW;
  const primaryCol: FlowRect = { x: rect.x, y: rect.y, width: primaryW, height: rect.height };
  const restCol: FlowRect = {
    x: rect.x + primaryW + gutter,
    y: rect.y,
    width: restW,
    height: rect.height,
  };

  if (count === 2) return [primaryCol, restCol];
  if (count === 3) return [primaryCol, ...splitColumn(restCol, [0.55, 0.45], gutter)];
  if (count === 4) {
    // Weighted 2×2: primary gets the wider column and the taller row.
    const topH = (rect.height - gutter) * 0.58;
    const botH = rect.height - gutter - topH;
    const botY = rect.y + topH + gutter;
    return [
      { x: primaryCol.x, y: rect.y, width: primaryW, height: topH },
      { x: restCol.x, y: rect.y, width: restW, height: topH },
      { x: primaryCol.x, y: botY, width: primaryW, height: botH },
      { x: restCol.x, y: botY, width: restW, height: botH },
    ];
  }
  if (count <= 8) {
    const rest = count - 1;
    const rcols = rest <= 3 ? 1 : 2;
    const rrows = Math.ceil(rest / rcols);
    const cells: FlowRect[] = [primaryCol];
    const rowH = (restCol.height - gutter * (rrows - 1)) / rrows;
    for (let r = 0; r < rrows; r++) {
      const inRow = Math.min(rcols, rest - r * rcols);
      const colW = (restCol.width - gutter * (inRow - 1)) / inRow;
      for (let c = 0; c < inRow; c++) {
        cells.push({
          x: restCol.x + c * (colW + gutter),
          y: restCol.y + r * (rowH + gutter),
          width: colW,
          height: rowH,
        });
      }
    }
    return cells;
  }
  return uniformGrid(count, rect, gutter);
}

/**
 * Tile every top-level panel node so together they fill `rect` edge-to-edge.
 * Effects, hidden nodes, and slotted children keep their place; tiled nodes get
 * `snapFill` (explicit height, cleared again on manual drag/resize) and are
 * un-collapsed so their content is visible.
 */
export function tileCanvasNodes(
  nodes: PanelFlowNode[],
  rect: FlowRect,
  opts: TileOptions = {},
): PanelFlowNode[] {
  if (rect.width < 320 || rect.height < 240) return nodes;
  const gutter = opts.gutter ?? 16;
  const tileable = nodes.filter(
    (n) => (n.type as string) !== 'effect' && n.parentId == null && !n.hidden,
  );
  if (tileable.length === 0) return nodes;

  const inset: FlowRect = {
    x: rect.x + gutter,
    y: rect.y + gutter,
    width: rect.width - gutter * 2,
    height: rect.height - gutter * 2,
  };
  const ordered = orderForTiling(tileable, opts.primaryKind);
  const cells = tileCells(ordered.length, inset, gutter, opts.primaryShare ?? 0.58);
  const placed = new Map<string, FlowRect>();
  ordered.forEach((n, i) => {
    const cell = cells[i];
    if (cell) placed.set(n.id, cell);
  });

  return nodes.map((n) => {
    const cell = placed.get(n.id);
    if (!cell) return n;
    const kind = n.data.kind ?? n.id;
    const width = capWidth(kind, cell.width);
    const { collapsed: _collapsed, interviewSeed: _seed, ...rest } = n.data;
    return {
      ...n,
      position: { x: cell.x + (cell.width - width) / 2, y: cell.y },
      width,
      height: cell.height,
      data: { ...rest, snapFill: true },
    };
  });
}

/** Snap the single selected node into a viewport region. Returns nodes unchanged if not exactly one selected. */
export function applyCanvasSnap(
  nodes: PanelFlowNode[],
  region: CanvasSnapRegion,
  visible: FlowRect,
): PanelFlowNode[] {
  const sel = nodes.filter((n) => n.selected);
  if (sel.length !== 1) return nodes;

  const target = regionRect(region, visible);
  const node = sel[0];
  if (!node) return nodes;
  const kind = node.data.kind ?? node.id;
  const width = capWidth(kind, target.width);
  const height = target.height;

  return nodes.map((n) => {
    if (n.id !== node.id) return n;
    return {
      ...n,
      position: { x: target.x, y: target.y },
      width,
      height,
      data: { ...n.data, snapFill: true },
    };
  });
}
