import { createPanelByType } from '@/core/panelRegistry';
import type { PanelFlowNode } from '@/shell/panels/panelTypes';

export interface InterviewBoardOptions {
  includeNotes?: boolean;
  includeProblem?: boolean;
  problemId?: string;
}

/** Spawn the default interview board: whiteboard + optional notes + collab code studio + optional problem. */
export function buildInterviewBoardNodes(
  opts: InterviewBoardOptions | boolean = true,
): PanelFlowNode[] {
  const resolved: InterviewBoardOptions =
    typeof opts === 'boolean' ? { includeNotes: opts, includeProblem: opts } : opts;

  const whiteboard = createPanelByType('whiteboard', { x: 40, y: 40 }) as PanelFlowNode;
  whiteboard.width = 920;
  const code = createPanelByType('collab-code', { x: 520, y: 420 }) as PanelFlowNode;
  code.width = 760;
  const nodes: PanelFlowNode[] = [whiteboard, code];

  if (resolved.includeNotes) {
    const notes = createPanelByType('notes', { x: 40, y: 420 }) as PanelFlowNode;
    notes.width = 440;
    nodes.splice(1, 0, notes);
  }
  if (resolved.includeProblem) {
    const workbench = createPanelByType('workbench', { x: 1000, y: 40 }) as PanelFlowNode;
    workbench.width = 1200;
    nodes.push(workbench);
  }
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
