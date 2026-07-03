import { createPanelByType } from '@/core/panelRegistry';
import type { PanelFlowNode } from '@/shell/panels/panelTypes';

/** Spawn the default interview board: whiteboard + optional notes + collab code studio. */
export function buildInterviewBoardNodes(includeNotes = true): PanelFlowNode[] {
  const whiteboard = createPanelByType('whiteboard', { x: 40, y: 40 }) as PanelFlowNode;
  whiteboard.width = 920;
  const code = createPanelByType('collab-code', { x: 520, y: 420 }) as PanelFlowNode;
  code.width = 760;
  const nodes: PanelFlowNode[] = [whiteboard, code];
  if (includeNotes) {
    const notes = createPanelByType('notes', { x: 40, y: 420 }) as PanelFlowNode;
    notes.width = 440;
    nodes.splice(1, 0, notes);
  }
  return nodes;
}
