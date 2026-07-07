import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNodeId, useReactFlow } from '@xyflow/react';
import { useWorkspace } from '@/store/workspace';
import { useCanvasCollab } from '../CanvasCollabProvider';
import {
  SUBDOC_TAG,
  emptyEditorPayload,
  emptyNotesPayload,
  emptyWhiteboardPayload,
  type EditorPayload,
  type NotesPayload,
  type SubDocKind,
  type SubDocPayload,
  type WhiteboardPayload,
} from '../protocol/subdocProtocol';
import { diffWhiteboardElements, snapshotFromPayload } from '../protocol/subdocMerge';
import { canEditSubDoc } from '../protocol/subdocPermissions';
import { useYjsCollab } from '../yjs/YjsCollabContext';
import { useYjsForSubdocs } from '../yjs/yjsConfig';
import type * as Y from 'yjs';
import {
  observeSubdocPanel,
  writeEditorSubdoc,
  writeNotesSubdoc,
  writeWhiteboardSubdoc,
} from '../yjs/yjsSubdocBinding';

function defaultPayload(kind: SubDocKind): SubDocPayload {
  if (kind === 'whiteboard') return emptyWhiteboardPayload();
  if (kind === 'notes') return emptyNotesPayload();
  return emptyEditorPayload();
}

function writeYjsSubdoc(
  doc: Y.Doc,
  nodeId: string,
  kind: SubDocKind,
  payload: SubDocPayload,
  rev: number,
): void {
  if (kind === 'whiteboard') writeWhiteboardSubdoc(doc, nodeId, payload as WhiteboardPayload, rev);
  else if (kind === 'notes') writeNotesSubdoc(doc, nodeId, payload as NotesPayload, rev);
  else writeEditorSubdoc(doc, nodeId, payload as EditorPayload, rev);
}

/** Hover-cursor stream cadence (~11/s) — well inside the relay's 20 msg/s budget. */
const CURSOR_EMIT_MS = 90;

export interface SubDocSyncResult {
  payload: SubDocPayload;
  setPayload: (next: SubDocPayload) => void;
  readOnly: boolean;
  isLive: boolean;
  locked: boolean;
  setLocked: (locked: boolean) => void;
  dark: boolean;
  /** Monotonic revision counter — changes on remote update. */
  rev: number;
  onPointerUpdate?: (payload: { pointer: { x: number; y: number }; button: 'up' | 'down' }) => void;
  remoteCursors: Array<{
    peerId: string;
    name: string;
    color: string;
    x: number;
    y: number;
    line?: number;
  }>;
}

export function useSubDocSync(kind: SubDocKind): SubDocSyncResult {
  const nodeId = useNodeId() ?? 'unknown';
  const { role, isCollaborating, session, isHost, subDocs, setSubDocs, emitSubDoc, subDocCursors } =
    useCanvasCollab();
  const { theme } = useWorkspace();
  const { getNode, setNodes } = useReactFlow();
  const { doc: yjsDoc } = useYjsCollab();
  const yjsSubdoc = useYjsForSubdocs();

  const canEdit = canEditSubDoc({ role, session, isCollaborating }, kind);
  const nodeData = getNode(nodeId)?.data as
    { subDoc?: { kind: string; rev: number; payload: unknown } } | undefined;
  const persisted =
    nodeData?.subDoc?.kind === kind ? (nodeData.subDoc.payload as SubDocPayload) : undefined;

  const remote = subDocs[nodeId];
  const remotePayload = remote?.kind === kind ? remote.payload : undefined;

  const [local, setLocal] = useState<SubDocPayload>(
    () => remotePayload ?? persisted ?? defaultPayload(kind),
  );
  const [locked, setLockedState] = useState(
    () =>
      !!(remotePayload as EditorPayload | undefined)?.locked ||
      !!(persisted as EditorPayload | undefined)?.locked,
  );
  const applyingRemote = useRef(false);
  const revRef = useRef(remote?.rev ?? nodeData?.subDoc?.rev ?? 0);
  const [revState, setRevState] = useState(revRef.current);

  useEffect(() => {
    if (!remotePayload) return;
    const nextRev = remote?.rev ?? 0;
    if (yjsSubdoc) return;
    // Only apply remote if it has a newer revision (host-authoritative)
    if (nextRev <= revRef.current && isHost) return;
    applyingRemote.current = true;
    setLocal(remotePayload);
    revRef.current = nextRev;
    setRevState(nextRev);
    if ((remotePayload as EditorPayload).locked != null) {
      setLockedState(!!(remotePayload as EditorPayload).locked);
    }
    applyingRemote.current = false;
  }, [remotePayload, remote?.rev, isHost, yjsSubdoc]);

  // Phase B.4: reconcile panel state from Yjs subdoc
  useEffect(() => {
    if (!yjsSubdoc || !yjsDoc || !isCollaborating) return;
    return observeSubdocPanel(yjsDoc, nodeId, (snap) => {
      if (!snap || snap.kind !== kind) return;
      applyingRemote.current = true;
      setLocal(snap.payload);
      revRef.current = snap.rev;
      setRevState(snap.rev);
      if ((snap.payload as EditorPayload).locked != null) {
        setLockedState(!!(snap.payload as EditorPayload).locked);
      }
      applyingRemote.current = false;
    });
  }, [yjsSubdoc, yjsDoc, isCollaborating, nodeId, kind]);

  useEffect(() => {
    if (isCollaborating || !persisted) return;
    setLocal(persisted);
  }, [persisted, isCollaborating]);

  const persistToNode = useCallback(
    (payload: SubDocPayload, rev: number) => {
      const snap = snapshotFromPayload(nodeId, kind, rev, payload);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, subDoc: snap as typeof n.data.subDoc } } : n,
        ),
      );
    },
    [nodeId, kind, setNodes],
  );

  const publishLocal = useCallback(
    (next: SubDocPayload) => {
      revRef.current += 1;
      const snap = snapshotFromPayload(nodeId, kind, revRef.current, next);
      persistToNode(next, revRef.current);
      if (isCollaborating && isHost) {
        setSubDocs((docs) => ({ ...docs, [nodeId]: snap }));
      }
    },
    [nodeId, kind, persistToNode, isCollaborating, isHost, setSubDocs],
  );

  const setPayload = useCallback(
    (next: SubDocPayload) => {
      if (!canEdit || locked || applyingRemote.current) return;
      setLocal(next);

      if (!isCollaborating) {
        persistToNode(next, revRef.current);
        return;
      }

      if (isHost) {
        publishLocal(next);
        if (yjsSubdoc && yjsDoc) {
          writeYjsSubdoc(yjsDoc, nodeId, kind, next, revRef.current);
        }
        return;
      }

      revRef.current += 1;
      persistToNode(next, revRef.current);

      if (yjsSubdoc && yjsDoc) {
        writeYjsSubdoc(yjsDoc, nodeId, kind, next, revRef.current);
        return;
      }

      if (kind === 'whiteboard') {
        const prev = (remotePayload as WhiteboardPayload | undefined) ?? emptyWhiteboardPayload();
        const { elements, removedIds } = diffWhiteboardElements(
          prev.elements,
          (next as WhiteboardPayload).elements,
        );
        if (elements.length || removedIds.length) {
          emitSubDoc({
            [SUBDOC_TAG]: 'patch-whiteboard',
            nodeId,
            elements,
            removedIds,
            rev: revRef.current,
          });
        }
      } else if (kind === 'notes') {
        emitSubDoc({
          [SUBDOC_TAG]: 'patch-notes',
          nodeId,
          text: (next as NotesPayload).text,
          rev: revRef.current,
        });
      } else {
        const ed = next as EditorPayload;
        emitSubDoc({
          [SUBDOC_TAG]: 'patch-editor',
          nodeId,
          text: ed.text,
          language: ed.language,
          rev: revRef.current,
        });
      }
    },
    [
      canEdit,
      locked,
      isCollaborating,
      isHost,
      kind,
      nodeId,
      emitSubDoc,
      persistToNode,
      publishLocal,
      remotePayload,
      yjsSubdoc,
      yjsDoc,
    ],
  );

  const setLocked = useCallback(
    (value: boolean) => {
      if (!isHost) return;
      setLockedState(value);
      if (kind !== 'collab-code') return;
      const next = { ...(local as EditorPayload), locked: value };
      publishLocal(next);
      setLocal(next);
      if (yjsSubdoc && yjsDoc) {
        writeEditorSubdoc(yjsDoc, nodeId, next, revRef.current);
      }
    },
    [isHost, kind, local, publishLocal, yjsSubdoc, yjsDoc, nodeId],
  );

  // Presence streams on hover as well as while drawing, throttled per panel.
  const lastCursorEmit = useRef(0);
  const onPointerUpdate = useCallback(
    (payload: { pointer: { x: number; y: number }; button: 'up' | 'down' }) => {
      if (!isCollaborating) return;
      const now = Date.now();
      if (now - lastCursorEmit.current < CURSOR_EMIT_MS) return;
      lastCursorEmit.current = now;
      emitSubDoc({
        [SUBDOC_TAG]: 'cursor',
        nodeId,
        kind,
        x: payload.pointer.x,
        y: payload.pointer.y,
      });
    },
    [isCollaborating, emitSubDoc, nodeId, kind],
  );

  const remoteCursors = useMemo(() => {
    const cursors = subDocCursors[nodeId];
    if (!cursors) return [];
    return Object.entries(cursors).map(([peerId, c]) => ({
      peerId,
      name: c.name,
      color: c.color,
      x: c.x,
      y: c.y,
      ...(c.line != null ? { line: c.line } : {}),
    }));
  }, [subDocCursors, nodeId]);

  return {
    payload: local,
    setPayload,
    readOnly: !canEdit || locked,
    isLive: isCollaborating,
    locked,
    setLocked,
    dark: theme !== 'light',
    rev: revState,
    ...(kind === 'whiteboard' ? { onPointerUpdate } : {}),
    remoteCursors,
  };
}
