import type { Edge, XYPosition } from '@xyflow/react';
import type { CanvasMode, ProblemPlugin } from '../../../core';
import { panelCategory, panelTitle } from '../../../core/panelRegistry';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import type { EdgePathType } from '@/lib/canvas/layoutPrefs';
import { sizeOf } from '../tokens';
import { defaultNodeIds, isSideTab, modeNodeIds, tabInMode } from './layoutPresets';

/** Shared input port on the visualizer — problem wires here. */
export const VIZ_INPUT_HANDLE = 'viz-in';

export function nodeCategory(id: string): string {
  return panelCategory(id);
}

export function kindTitle(plugin: ProblemPlugin<any, any>, id: string): string {
  return panelTitle(id, plugin.tabs?.find((t) => t.id === id)?.label);
}

function makeNode(id: string, title: string, position: XYPosition): PanelFlowNode {
  const { w } = sizeOf(id);
  return { id, type: 'panel', position, width: w, data: { kind: id, title } };
}

/** Side-dock tabs that belong to the given canvas mode (Cases→visualize, Simulate→learn). */
export function sidePanelTabs(plugin: ProblemPlugin<any, any>, mode: CanvasMode) {
  return (plugin.tabs ?? []).filter((t) => isSideTab(t) && tabInMode(t, mode));
}

export function buildNodes(plugin: ProblemPlugin<any, any>, mode: CanvasMode): PanelFlowNode[] {
  return defaultNodeIds(plugin, mode).map((id) =>
    makeNode(id, kindTitle(plugin, id), { x: 0, y: 0 }),
  );
}

/** A single node for a kind at a drop position (drag-to-add). */
export function nodeForKind(
  plugin: ProblemPlugin<any, any>,
  id: string,
  position: XYPosition,
): PanelFlowNode {
  return makeNode(id, kindTitle(plugin, id), position);
}

/** Obsolete shell edges from before the unified workbench panel; stripped on load. */
export const DEPRECATED_VISUALIZE_EDGES = new Set([
  'examples->problem',
  'examples->viz',
  'problem->viz',
  'viz->code',
]);

/** Shell edges always restored on sanitize (data path). */
export const REQUIRED_VISUALIZE_EDGES = new Set<string>();

const SHELL_WIRES: Record<CanvasMode, [string, string, string?][]> = {
  play: [],
  visualize: [],
  learn: [
    ['predict', 'mastery'],
    ['mastery', 'code'],
    ['code', 'explain'],
    ['explain', 'badges'],
  ],
};

function pluginWires(
  plugin: ProblemPlugin<any, any>,
  mode: CanvasMode,
): [string, string, string?][] {
  if (mode === 'learn') return plugin.wires?.learn ?? plugin.wires?.practice ?? [];
  if (mode === 'play') return plugin.wires?.visualize ?? [];
  return plugin.wires?.[mode] ?? [];
}

function allWires(plugin: ProblemPlugin<any, any>, mode: CanvasMode): [string, string, string?][] {
  return [...SHELL_WIRES[mode], ...pluginWires(plugin, mode)];
}

function rawEdge(a: string, b: string, label?: string): Edge {
  const id = `${a}->${b}`;
  const targetHandle = b === 'viz' && a === 'problem' ? VIZ_INPUT_HANDLE : undefined;
  const data: Record<string, unknown> = { pathType: 'bezier' as EdgePathType };
  if (label) data.label = label;
  return {
    id,
    source: a,
    target: b,
    type: 'removable',
    ...(targetHandle ? { targetHandle } : {}),
    data,
  };
}

export function buildEdges(plugin: ProblemPlugin<any, any>, mode: CanvasMode): Edge[] {
  const ids = new Set(modeNodeIds(plugin, mode));
  return allWires(plugin, mode)
    .filter(([a, b]) => ids.has(a) && ids.has(b))
    .map(([a, b, label]) => rawEdge(a, b, label));
}

/** Next panel in a mode's wire chain after `fromId`, if any. */
export function nextPracticePanel(
  plugin: ProblemPlugin<any, any>,
  mode: CanvasMode,
  fromId: string,
): string | null {
  const edge = allWires(plugin, mode).find(([a]) => a === fromId);
  return edge ? edge[1] : null;
}

/** Edges touching `id` whose other endpoint is present (used when re-adding a dropped node). */
export function edgesForKind(
  plugin: ProblemPlugin<any, any>,
  mode: CanvasMode,
  id: string,
  present: Set<string>,
): Edge[] {
  return allWires(plugin, mode)
    .filter(([a, b]) => (a === id || b === id) && present.has(a) && present.has(b))
    .map(([a, b, label]) => rawEdge(a, b, label));
}
