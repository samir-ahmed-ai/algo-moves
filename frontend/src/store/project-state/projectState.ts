import { compressToBase64, decompressFromBase64 } from 'lz-string';
import type { Edge, Node } from '@xyflow/react';
import type { CanvasMode } from '@/core';
import type { ShareState } from '@/store/navigation/shareState';
import { getPanelConfig } from '@/core/panelRegistry';
import { isKnownEffectId } from '@/effects/registry';

export interface ProjectState {
  version: 1;
  share: ShareState;
  nodes: Node[];
  edges: Edge[];
  removedPanels?: string[];
  removedEdges?: string[];
  speed?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isShareState(value: unknown): value is ShareState {
  return isRecord(value);
}

function isProjectState(value: unknown): value is ProjectState {
  if (!isRecord(value)) return false;
  const candidate = value as Partial<ProjectState>;
  return (
    candidate.version === 1 &&
    isShareState(candidate.share) &&
    Array.isArray(candidate.nodes) &&
    Array.isArray(candidate.edges)
  );
}

function normalizeStringId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return id ? id : null;
}

function compactStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of value) {
    const id = normalizeStringId(entry);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids.length ? ids : undefined;
}

function normalizeSpeed(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function normalizeNode(node: Node): Node | null {
  const id = normalizeStringId(node.id);
  if (!id) return null;
  return { ...node, id };
}

function normalizeNodes(nodes: Node[]): Node[] {
  const seen = new Set<string>();
  const next: Node[] = [];
  for (const node of sanitizeLoadedNodes(nodes)) {
    const normalized = normalizeNode(node);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    next.push(normalized);
  }
  return next;
}

function normalizeEdges(edges: Edge[], nodes: Node[]): Edge[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const seen = new Set<string>();
  const next: Edge[] = [];
  for (const edge of edges) {
    const id = normalizeStringId(edge.id);
    const source = normalizeStringId(edge.source);
    const target = normalizeStringId(edge.target);
    if (!id || !source || !target || seen.has(id)) continue;
    if (!nodeIds.has(source) || !nodeIds.has(target)) continue;
    seen.add(id);
    next.push({ ...edge, id, source, target });
  }
  return next;
}

function normalizeProjectState(value: unknown): ProjectState | null {
  if (!isProjectState(value) || !isRecord(value.share)) return null;
  const nodes = normalizeNodes(value.nodes);
  const removedPanels = compactStringList(value.removedPanels);
  const removedEdges = compactStringList(value.removedEdges);
  const speed = normalizeSpeed(value.speed);
  return {
    version: 1,
    share: value.share,
    nodes,
    edges: normalizeEdges(value.edges, nodes),
    ...(removedPanels ? { removedPanels } : {}),
    ...(removedEdges ? { removedEdges } : {}),
    ...(speed ? { speed } : {}),
  };
}

export function encodeProjectState(state: ProjectState): string {
  return compressToBase64(JSON.stringify(state));
}

export function decodeProjectState(encoded: string): ProjectState | null {
  try {
    const json = decompressFromBase64(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json);
    return normalizeProjectState(parsed);
  } catch {
    return null;
  }
}

/** Drop unknown panel kinds / effect types for forward-compatible loads. */
export function filterKnownNodes(nodes: Node[]): Node[] {
  return nodes.filter((n) => {
    if (n.type === 'effect') {
      const effectId = (n.data as { effectId?: string })?.effectId;
      return typeof effectId === 'string' && isKnownEffectId(effectId);
    }
    if (n.type === 'panel') {
      const kind = (n.data as { kind?: string })?.kind;
      if (typeof kind !== 'string') return false;
      return (
        getPanelConfig(kind) != null ||
        kind.startsWith('cases') ||
        kind === 'quiz' ||
        kind === 'simulate'
      );
    }
    return false;
  });
}

/** Safe defaults on import — no autoplay, panels paused. */
export function sanitizeLoadedNodes(nodes: Node[]): Node[] {
  return filterKnownNodes(nodes).map((n) => ({
    ...n,
    data: {
      ...n.data,
      runState: 'paused',
    },
  }));
}

export function getProjectShareUrl(state: ProjectState): string {
  const url = new URL(window.location.href);
  url.searchParams.set('state', encodeProjectState(state));
  return url.toString();
}

export function loadProjectFromUrl(): ProjectState | null {
  const param = new URLSearchParams(window.location.search).get('state');
  return param ? decodeProjectState(param) : null;
}

export function projectStateToJson(state: ProjectState): string {
  return JSON.stringify(state, null, 2);
}

export function projectStateFromJson(json: string): ProjectState | null {
  try {
    const parsed = JSON.parse(json);
    return normalizeProjectState(parsed);
  } catch {
    return null;
  }
}

export function downloadProjectState(
  state: ProjectState,
  filename = 'algo-moves-project.json',
): void {
  const blob = new Blob([projectStateToJson(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildMinimalProjectState(
  share: ShareState,
  _mode: CanvasMode,
  nodes: Node[],
  edges: Edge[],
  extras?: Partial<Pick<ProjectState, 'removedPanels' | 'removedEdges' | 'speed'>>,
): ProjectState {
  const removedPanels = compactStringList(extras?.removedPanels);
  const removedEdges = compactStringList(extras?.removedEdges);
  const speed = normalizeSpeed(extras?.speed);
  return {
    version: 1,
    share,
    nodes,
    edges,
    ...(removedPanels ? { removedPanels } : {}),
    ...(removedEdges ? { removedEdges } : {}),
    ...(speed ? { speed } : {}),
  };
}
