import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  emptyWhiteboardPayload,
  type WhiteboardPayload,
} from '@/shell/collab/protocol/subdocProtocol';
import { useCanvasCollab } from '@/shell/collab/CanvasCollabProvider';
import { useYjsCollab } from '@/shell/collab/yjs/YjsCollabContext';
import { useYjsForSubdocs } from '@/shell/collab/yjs/yjsConfig';
import { readYjsSubdocs } from '@/shell/collab/yjs/yjsSubdocBinding';
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
 * sub-doc and appends elements through `updateSubDocPayload`, which writes the
 * live transport (Yjs map or host relay envelope) plus local React state so the
 * host sees the card immediately. Host-only.
 */
export function useSendToBoard(): SendToBoard {
  const { isHost, isCollaborating, subDocs, updateSubDocPayload } = useCanvasCollab();
  const { doc: yjsDoc } = useYjsCollab();
  const { getNodes } = useReactFlow();

  const findBoard = useCallback(() => {
    // Prefer the live Yjs map (carries guest strokes), then the React sub-doc,
    // then a node's persisted interior.
    if (useYjsForSubdocs() && yjsDoc) {
      const live = Object.values(readYjsSubdocs(yjsDoc)).find((d) => d.kind === 'whiteboard');
      if (live) {
        return { nodeId: live.nodeId, rev: live.rev, payload: live.payload as WhiteboardPayload };
      }
    }
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
  }, [subDocs, getNodes, yjsDoc]);

  const canSend = isHost && isCollaborating && !!findBoard();

  const readBoard = useCallback(() => findBoard()?.payload ?? null, [findBoard]);

  const sendQuestion = useCallback(
    (text: string, category?: string) => {
      const board = findBoard();
      if (!board || !isHost) return false;
      updateSubDocPayload(board.nodeId, 'whiteboard', (prev) => {
        const base = (prev as WhiteboardPayload | null) ?? board.payload;
        // Stagger by the number of cards already on the board so they don't stack.
        const n = base.elements?.length ?? 0;
        const at = { x: 80 + (n % 6) * 28, y: 80 + (n % 9) * 28 };
        const cards = buildQuestionCardElements(text, at, category);
        return { ...base, elements: [...(base.elements ?? []), ...cards] };
      });
      return true;
    },
    [findBoard, isHost, updateSubDocPayload],
  );

  return { canSend, readBoard, sendQuestion };
}
