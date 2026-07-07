import { useEffect, useRef, useState } from 'react';
import { useCanvasCollab } from '@/shell/collab/CanvasCollabProvider';
import { useYjsCollab } from '@/shell/collab/yjs/YjsCollabContext';
import { useYjsForSubdocs } from '@/shell/collab/yjs/yjsConfig';
import { bindSubdocRoot, readYjsSubdocs } from '@/shell/collab/yjs/yjsSubdocBinding';
import { updateInterviewSession } from '@/platform/api/interviewApi';
import type { SubDocSnapshot, WhiteboardPayload } from '@/shell/collab/protocol/subdocProtocol';

const DEBOUNCE_MS = 3000;

/**
 * Host-only: debounce-persist the interview whiteboard into the durable session
 * so ending, exporting, or resuming a session keeps the board. No-ops when the
 * session has no durable id (DB-less) or the local peer isn't the host.
 * Watches both the React sub-doc state (relay fallback) and the live Yjs map
 * (guest strokes never touch React state under the Yjs transport).
 * Call once inside the canvas.
 */
export function useInterviewBoardPersistence(): void {
  const { isHost, isCollaborating, session, subDocs } = useCanvasCollab();
  const { doc: yjsDoc } = useYjsCollab();
  const sessionId = session.sessionId;
  const active = isHost && isCollaborating && session.kind === 'interview' && !!sessionId;

  // Yjs-delivered whiteboard changes (e.g. guest strokes) bypass React subDocs;
  // observe the doc directly so they still schedule a save.
  const [yjsBoard, setYjsBoard] = useState<SubDocSnapshot | null>(null);
  useEffect(() => {
    if (!active || !yjsDoc || !useYjsForSubdocs()) {
      setYjsBoard(null);
      return;
    }
    const root = bindSubdocRoot(yjsDoc);
    const handler = () => {
      const board =
        Object.values(readYjsSubdocs(yjsDoc)).find((d) => d.kind === 'whiteboard') ?? null;
      setYjsBoard((prev) =>
        prev?.nodeId === board?.nodeId && prev?.rev === board?.rev ? prev : board,
      );
    };
    root.observeDeep(handler);
    handler();
    return () => root.unobserveDeep(handler);
  }, [active, yjsDoc]);

  const reactBoard = Object.values(subDocs).find((d) => d.kind === 'whiteboard');
  const board = yjsBoard && (!reactBoard || yjsBoard.rev >= reactBoard.rev) ? yjsBoard : reactBoard;
  const rev = board?.rev ?? 0;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(0);
  const payloadRef = useRef<WhiteboardPayload | undefined>();
  payloadRef.current = board?.payload as WhiteboardPayload | undefined;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const pendingRev = useRef(0);

  // Flush any pending save immediately (used on end/unmount so the last edits
  // within the debounce window aren't lost).
  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const id = sessionIdRef.current;
    if (!id || pendingRev.current === 0 || pendingRev.current === lastSaved.current) return;
    lastSaved.current = pendingRev.current;
    const payload = payloadRef.current;
    if (payload) void updateInterviewSession(id, { canvas: payload });
  };

  useEffect(() => {
    if (!active || !sessionId || rev === 0 || rev === lastSaved.current) return;
    pendingRev.current = rev;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active, sessionId, rev]);

  // Flush on unmount / when the session ends (active flips false).
  useEffect(() => {
    if (active) return;
    flush();
  }, [active]);

  useEffect(() => () => flush(), []);
}
