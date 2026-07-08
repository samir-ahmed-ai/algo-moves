import { createPanelByType } from '@/core/panelRegistry';
import type { PanelFlowNode } from '@/shell/panels/panelTypes';

export interface InterviewBoardOptions {
  includeNotes?: boolean;
  includeProblem?: boolean;
  problemId?: string;
}

/**
 * Spawn the default interview board: whiteboard + optional notes + collab code
 * studio + optional problem. Positions are a non-overlapping fallback only —
 * nodes carry `interviewSeed` so CanvasStage retiles them to fill the real
 * viewport once it has measured (see tileCanvasNodes).
 */
export function buildInterviewBoardNodes(
  opts: InterviewBoardOptions | boolean = true,
): PanelFlowNode[] {
  const resolved: InterviewBoardOptions =
    typeof opts === 'boolean' ? { includeNotes: opts, includeProblem: opts } : opts;

  const whiteboard = createPanelByType('whiteboard', { x: 0, y: 0 }) as PanelFlowNode;
  whiteboard.width = 920;
  const code = createPanelByType('collab-code', { x: 0, y: 680 }) as PanelFlowNode;
  code.width = 760;
  const nodes: PanelFlowNode[] = [whiteboard, code];

  if (resolved.includeNotes) {
    const notes = createPanelByType('notes', { x: 940, y: 0 }) as PanelFlowNode;
    notes.width = 440;
    nodes.splice(1, 0, notes);
  }
  if (resolved.includeProblem) {
    const workbench = createPanelByType('workbench', { x: 1400, y: 0 }) as PanelFlowNode;
    workbench.width = 1200;
    nodes.push(workbench);
  }
  for (const n of nodes) n.data = { ...n.data, interviewSeed: true };
  return nodes;
}

/**
 * Merge interview layout nodes into an existing node set: only add panel kinds
 * that aren't already present, preserving existing user layout.
 */
export function mergeInterviewNodes(
  existing: PanelFlowNode[],
  incoming: PanelFlowNode[],
): PanelFlowNode[] {
  const existingKinds = new Set(existing.map((n) => n.data?.kind));
  const toAdd = incoming.filter((n) => !existingKinds.has(n.data?.kind));
  return [...existing, ...toAdd];
}
