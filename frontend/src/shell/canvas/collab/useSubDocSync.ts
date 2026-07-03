import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNodeId, useReactFlow } from '@xyflow/react';
import { useWorkspace } from '@/store/workspace';
import { useCanvasCollab } from './CanvasCollabProvider';
import {
  SUBDOC_TAG,
  emptyEditorPayload,
  emptyWhiteboardPayload,
  type EditorPayload,
  type SubDocKind,
  type WhiteboardPayload,
} from './subdocProtocol';
import { diffWhiteboardElements, snapshotFromPayload } from './subdocMerge';
import { canEditSubDoc } from './subdocPermissions';

function defaultPayload(kind: SubDocKind): WhiteboardPayload | EditorPayload {
  return kind === 'whiteboard' ? emptyWhiteboardPayload() : emptyEditorPayload();
}

export interface SubDocSyncResult {
  payload: WhiteboardPayload | EditorPayload;
  setPayload: (next: WhiteboardPayload | EditorPayload) => void;
  readOnly: boolean;
  isLive: boolean;
  locked: boolean;
  setLocked: (locked: boolean) => void;
  dark: boolean;
  onPointerUpdate?: (payload: { pointer: { x: number; y: number }; button: 'up' | 'down' }) => void;
  remoteCursors: Array<{ peerId: string; name: string; color: string; x: number; y: number; line?: number }>;
}

export function useSubDocSync(kind: SubDocKind): SubDocSyncResult {
  const nodeId = useNodeId() ?? 'unknown';
  const {
    role,
    isCollaborating,
    session,
    isHost,
    subDocs,
    setSubDocs,
    emitSubDoc,
    subDocCursors,
  } = useCanvasCollab();
  const { theme } = useWorkspace();
  const { getNode, setNodes } = useReactFlow();

  const canEdit = canEditSubDoc({ role, session, isCollaborating }, kind);
  const nodeData = getNode(nodeId)?.data as { subDoc?: { kind: string; rev: number; payload: unknown } } | undefined;
  const persisted =
    nodeData?.subDoc?.kind === kind
      ? (nodeData.subDoc.payload as WhiteboardPayload | EditorPayload)
      : undefined;

  const remote = subDocs[nodeId];
  const remotePayload =
    remote?.kind === kind ? remote.payload : undefined;

  const [local, setLocal] = useState<WhiteboardPayload | EditorPayload>(
    () => remotePayload ?? persisted ?? defaultPayload(kind),
  );
  const [locked, setLockedState] = useState(
    () => !!(remotePayload as EditorPayload | undefined)?.locked || !!(persisted as EditorPayload | undefined)?.locked,
  );
  const applyingRemote = useRef(false);
  const revRef = useRef(remote?.rev ?? nodeData?.subDoc?.rev ?? 0);

  useEffect(() => {
    if (!remotePayload) return;
    applyingRemote.current = true;
    setLocal(remotePayload);
    revRef.current = remote?.rev ?? revRef.current;
    if ((remotePayload as EditorPayload).locked != null) {
      setLockedState(!!(remotePayload as EditorPayload).locked);
    }
    applyingRemote.current = false;
  }, [remotePayload, remote?.rev]);

  useEffect(() => {
    if (isCollaborating || !persisted) return;
    setLocal(persisted);
  }, [persisted, isCollaborating]);

  const persistToNode = useCallback(
    (payload: WhiteboardPayload | EditorPayload, rev: number) => {
      const snap = snapshotFromPayload(nodeId, kind, rev, payload);
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, subDoc: snap } } : n)),
      );
    },
    [nodeId, kind, setNodes],
  );

  const publishLocal = useCallback(
    (next: WhiteboardPayload | EditorPayload) => {
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
    (next: WhiteboardPayload | EditorPayload) => {
      if (!canEdit || locked || applyingRemote.current) return;
      setLocal(next);

      if (!isCollaborating) {
        persistToNode(next, revRef.current);
        return;
      }

      if (isHost) {
        publishLocal(next);
        return;
      }

      revRef.current += 1;
      persistToNode(next, revRef.current);

      if (kind === 'whiteboard') {
        const prev = (remotePayload as WhiteboardPayload | undefined) ?? emptyWhiteboardPayload();
        const { elements, removedIds } = diffWhiteboardElements(prev.elements, (next as WhiteboardPayload).elements);
        if (elements.length || removedIds.length) {
          emitSubDoc({
            [SUBDOC_TAG]: 'patch-whiteboard',
            nodeId,
            elements,
            removedIds,
            rev: revRef.current,
          });
        }
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
    },
    [isHost, kind, local, publishLocal],
  );

  const onPointerUpdate = useCallback(
    (payload: { pointer: { x: number; y: number }; button: 'up' | 'down' }) => {
      if (!isCollaborating || payload.button === 'up') return;
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
      line: c.line,
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
    onPointerUpdate: kind === 'whiteboard' ? onPointerUpdate : undefined,
    remoteCursors,
  };
}
