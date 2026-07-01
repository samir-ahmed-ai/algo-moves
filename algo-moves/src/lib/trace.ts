import type { Edge, Node } from '@xyflow/react';
import type { Frame } from '../core/types';
import type { PanelRunState } from '../core/panelRegistry';
import { applyEffect, effectTraceSnippet } from '../effects/registry';
import { findConnectedComponents } from './connectedComponents';

export interface EffectNodeData extends Record<string, unknown> {
  effectId: string;
  effectData?: Record<string, unknown>;
  runState?: PanelRunState;
  title?: string;
}

export type WorkflowNode = Node & { type?: string };

/** Topological walk from sources through nodes in a component. */
export function effectChainOrder(
  nodeIds: Set<string>,
  edges: Edge[],
  isEffect: (id: string) => boolean,
): string[] {
  const inComponent = (id: string) => nodeIds.has(id);
  const subgraphEdges = edges.filter((e) => inComponent(e.source) && inComponent(e.target));
  const inCount = new Map<string, number>();
  for (const id of nodeIds) inCount.set(id, 0);
  for (const e of subgraphEdges) {
    inCount.set(e.target, (inCount.get(e.target) ?? 0) + 1);
  }
  const heads = [...nodeIds].filter((id) => (inCount.get(id) ?? 0) === 0);
  const ordered: string[] = [];
  const visited = new Set<string>();
  const next = new Map<string, string>();
  for (const e of subgraphEdges) {
    if (!next.has(e.source)) next.set(e.source, e.target);
  }
  for (const head of heads) {
    let cur: string | undefined = head;
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      ordered.push(cur);
      cur = next.get(cur);
    }
  }
  for (const id of nodeIds) {
    if (!visited.has(id)) ordered.push(id);
  }
  return ordered.filter((id) => isEffect(id));
}

export function isEffectFlowNode(node: WorkflowNode): node is Node<EffectNodeData, 'effect'> {
  return node.type === 'effect';
}

export function getEffectIdFromNode(node: WorkflowNode): string | null {
  if (!isEffectFlowNode(node)) return null;
  return node.data?.effectId ?? null;
}

/** Apply wired effect chain to base frames. Skips paused/stopped chains. */
export function transformFramesForGraph(
  baseFrames: Frame[],
  nodes: WorkflowNode[],
  edges: Edge[],
  chainRunStates?: Map<string, PanelRunState>,
): Frame[] {
  if (baseFrames.length === 0) return baseFrames;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const ids = nodes.map((n) => n.id);
  const components = findConnectedComponents(ids, edges);

  const lanes: Frame[][] = [];

  for (const comp of components) {
    const compSet = new Set(comp);
    const runState = comp.find((id) => chainRunStates?.get(id) === 'stopped')
      ? 'stopped'
      : comp.find((id) => chainRunStates?.get(id) === 'paused')
        ? 'paused'
        : 'running';
    if (runState === 'stopped') continue;

    const order = effectChainOrder(compSet, edges, (id) => {
      const n = nodeMap.get(id);
      return !!n && isEffectFlowNode(n);
    });
    if (order.length === 0) continue;

    let lane = baseFrames;
    for (const nodeId of order) {
      const node = nodeMap.get(nodeId);
      if (!node || !isEffectFlowNode(node)) continue;
      const effectId = node.data.effectId;
      if (!effectId) continue;
      lane = applyEffect(effectId, lane, node.data.effectData ?? {});
    }
    lanes.push(lane);
  }

  if (lanes.length === 0) return baseFrames;
  if (lanes.length === 1) return lanes[0];
  return stackFrames(lanes);
}

/** Parallel stack() — interleave multiple frame lanes (Strudel multi-source). */
export function stackFrames(lanes: Frame[][]): Frame[] {
  const max = Math.max(0, ...lanes.map((l) => l.length));
  const out: Frame[] = [];
  for (let i = 0; i < max; i++) {
    for (const lane of lanes) {
      if (lane[i]) out.push(lane[i]);
    }
  }
  return out.length ? out : lanes.flat();
}

/** Human-readable trace string for all frames (Strudel PatternPanel analogue). */
export function generateTrace(
  frames: Frame[],
  nodes: WorkflowNode[] = [],
  edges: Edge[] = [],
  options?: { chainPaused?: boolean },
): string {
  const lines: string[] = [];

  if (nodes.length > 0 && edges.length > 0) {
    const effectNodes = nodes.filter(isEffectFlowNode);
    if (effectNodes.length > 0) {
      lines.push('// effect chain');
      for (const n of effectNodes) {
        const id = n.data.effectId;
        if (id) lines.push(`// ${effectTraceSnippet(id, n.data.effectData)}`);
      }
    }
  }

  frames.forEach((f, i) => {
    const prefix = f.move.tone === 'good' ? '✓' : f.move.tone === 'bad' ? '✗' : '·';
    lines.push(`${String(i + 1).padStart(3, ' ')} ${prefix} [${f.move.type}] ${f.move.caption}`);
    if (f.move.note) lines.push(`      note: ${f.move.note}`);
  });

  const body = lines.join('\n');
  return options?.chainPaused ? annotateInactiveChains(body, true) : body;
}

/** Trace snippet for a single panel at the current frame index. */
export function traceOutputForPanel(
  panelKind: string,
  frames: Frame[],
  frameIndex: number,
): string {
  const f = frames[frameIndex];
  if (!f) return `${panelKind}: (no frame)`;
  return [
    `${panelKind} @ step ${frameIndex + 1}/${frames.length}`,
    `type: ${f.move.type}`,
    f.move.note ? `note: ${f.move.note}` : null,
    `caption: ${f.move.caption}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Comment-out inactive chains (Strudel // $: pattern). */
export function annotateInactiveChains(trace: string, paused: boolean): string {
  if (!paused) return trace;
  return trace
    .split('\n')
    .map((line) => (line.startsWith('//') ? line : `// $: ${line}`))
    .join('\n');
}
