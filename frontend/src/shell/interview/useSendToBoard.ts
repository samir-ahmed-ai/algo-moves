import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { snapshotFromPayload } from '@/shell/collab/protocol/subdocMerge';
import {
  emptyWhiteboardPayload,
  type WhiteboardPayload,
} from '@/shell/collab/protocol/subdocProtocol';
import { useCanvasCollab } from '@/shell/collab/CanvasCollabProvider';
import { buildQuestionCardElements } from './questionCard';

interface SendToBoard {
  /** Whether a whiteboard node exists and the local peer may inject into it. */
  canSend: boolean;
  /** Read the current whiteboard payload (for export), or null. */
  readBoard: () => WhiteboardPayload | null;
  /** Append a question card to the interview whiteboard. Returns false if no board. */
  sendQuestion: (text: string, category?: string) => boolean;
}

/**
 * Bridges the sidebar to the interview whiteboard node: locates the whiteboard
 * sub-doc and appends elements through the host-authoritative `setSubDocs` path
 * so guests receive them via the published envelope. Host-only.
 */
export function useSendToBoard(): SendToBoard {
  const { isHost, isCollaborating, subDocs, setSubDocs } = useCanvasCollab();
  const { getNodes } = useReactFlow();

  const findBoard = useCallback(() => {
    // Prefer a live sub-doc; fall back to a node's persisted interior.
    const fromDocs = Object.entries(subDocs).find(([, d]) => d.kind === 'whiteboard');
    if (fromDocs) {
      return {
        nodeId: fromDocs[0],
        rev: fromDocs[1].rev,
        payload: fromDocs[1].payload as WhiteboardPayload,
      };
    }
    const node = getNodes().find((n) => (n.data as { kind?: string })?.kind === 'whiteboard');
    if (!node) return null;
    const sub = (node.data as { subDoc?: { rev?: number; payload?: WhiteboardPayload } }).subDoc;
    return {
      nodeId: node.id,
      rev: sub?.rev ?? 0,
      payload: sub?.payload ?? emptyWhiteboardPayload(),
    };
  }, [subDocs, getNodes]);

  const canSend = isHost && isCollaborating && !!findBoard();

  const readBoard = useCallback(() => findBoard()?.payload ?? null, [findBoard]);

  const sendQuestion = useCallback(
    (text: string, category?: string) => {
      const board = findBoard();
      if (!board || !isHost) return false;
      // Stagger by the number of cards already on the board so they don't stack.
      const n = board.payload.elements?.length ?? 0;
      const at = { x: 80 + (n % 6) * 28, y: 80 + (n % 9) * 28 };
      const cards = buildQuestionCardElements(text, at, category);
      const nextPayload: WhiteboardPayload = {
        ...board.payload,
        elements: [...(board.payload.elements ?? []), ...cards],
      };
      setSubDocs((docs) => ({
        ...docs,
        [board.nodeId]: snapshotFromPayload(board.nodeId, 'whiteboard', board.rev + 1, nextPayload),
      }));
      return true;
    },
    [findBoard, isHost, subDocs, setSubDocs],
  );

  return { canSend, readBoard, sendQuestion };
}
