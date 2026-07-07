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

function isShareState(value: unknown): value is ShareState {
  return value != null && typeof value === 'object';
}

function isProjectState(value: unknown): value is ProjectState {
  const candidate = value as Partial<ProjectState>;
  return (
    !!candidate &&
    candidate.version === 1 &&
    isShareState(candidate.share) &&
    Array.isArray(candidate.nodes) &&
    Array.isArray(candidate.edges)
  );
}

export function encodeProjectState(state: ProjectState): string {
  return compressToBase64(JSON.stringify(state));
}

export function decodeProjectState(encoded: string): ProjectState | null {
  try {
    const json = decompressFromBase64(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json);
    return isProjectState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Drop unknown panel kinds / effect types for forward-compatible loads. */
export function filterKnownNodes(nodes: Node[]): Node[] {
  return nodes.filter((n) => {
    if (n.type === 'effect') {
      const effectId = (n.data as { effectId?: string })?.effectId;
      return effectId != null && isKnownEffectId(effectId);
    }
    if (n.type === 'panel') {
      const kind = (n.data as { kind?: string })?.kind;
      return (
        kind != null &&
        (getPanelConfig(kind) != null ||
          kind.startsWith('cases') ||
          kind === 'quiz' ||
          kind === 'simulate')
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
    return isProjectState(parsed) ? parsed : null;
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
  return {
    version: 1,
    share,
    nodes,
    edges,
    ...extras,
  };
}
