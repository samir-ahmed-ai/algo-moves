import { useEffect, useMemo, useRef } from 'react';
import type { Edge } from '@xyflow/react';
import { useGameRoom } from '@/shell/realtime';
import { usePublishState } from '@/shell/realtime';
import { buildSessionRoomState } from '@/shell/realtime/roomState';
import { useCanvasCollab } from '../CanvasCollabProvider';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import { docSignature, mergeRemoteNodes } from '../protocol/canvasDoc';
import { type SubDocKind, type SubDocPayload } from '../protocol/subdocProtocol';
import { snapshotFromPayload } from '../protocol/subdocMerge';
import { observeCanvasDoc, writeCanvasDoc } from '../yjs/yjsCanvasBinding';
import { useYjsCollab } from '../yjs/YjsCollabContext';
import { useYjsForCanvasGraph } from '../yjs/yjsConfig';

type SetNodes = (u: PanelFlowNode[] | ((prev: PanelFlowNode[]) => PanelFlowNode[])) => void;
type SetEdges = (u: Edge[] | ((prev: Edge[]) => Edge[])) => void;

interface DocSyncArgs {
  nodes: PanelFlowNode[];
  edges: Edge[];
  setNodes: SetNodes;
  setEdges: SetEdges;
}

/** Binds the live canvas document to Yjs/Hocuspocus; session metadata uses the room relay. */
export function useCanvasDocSync({ nodes, edges, setNodes, setEdges }: DocSyncArgs): void {
  const { role, isCollaborating, session, comments, setComments, broadcastSelection, setSubDocs } =
    useCanvasCollab();
  const { publishState } = useGameRoom();
  const { doc: yjsDoc, mode: yjsMode } = useYjsCollab();
  const yjsTransport = useYjsForCanvasGraph();

  const isHost = role === 'host';
  const prevNodes = useRef<PanelFlowNode[]>(nodes);
  const seededSubDocs = useRef(false);
  const applyingYjs = useRef(false);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const commentsRef = useRef(comments);
  commentsRef.current = comments;

  useEffect(() => {
    if (!isHost || !isCollaborating || seededSubDocs.current) return;
    seededSubDocs.current = true;
    const initial: Record<string, ReturnType<typeof snapshotFromPayload>> = {};
    const subDocKinds = new Set(['whiteboard', 'collab-code']);
    for (const n of nodesRef.current) {
      const kind = n.data?.kind;
      const sub = n.data?.subDoc;
      if (kind && subDocKinds.has(kind) && sub?.payload) {
        initial[n.id] = snapshotFromPayload(
          n.id,
          kind as SubDocKind,
          sub.rev ?? 0,
          sub.payload as SubDocPayload,
        );
      }
    }
    if (Object.keys(initial).length > 0) {
      setSubDocs((prev) => ({ ...initial, ...prev }));
    }
  }, [isHost, isCollaborating, setSubDocs]);

  useEffect(() => {
    if (!isCollaborating) seededSubDocs.current = false;
  }, [isCollaborating]);

  const interviewSig = session.interview ? JSON.stringify(session.interview) : '';
  const runtimeSig = session.interviewRuntime ? JSON.stringify(session.interviewRuntime) : '';

  const sessionPublishKey = [session.kind, session.activeProblemId, interviewSig, runtimeSig].join(
    '|',
  );

  usePublishState(isHost && isCollaborating, [sessionPublishKey], () => {
    publishState(buildSessionRoomState(session));
  });

  useEffect(() => {
    if (!yjsTransport || yjsMode !== 'transport' || !yjsDoc || !isCollaborating) return;
    return observeCanvasDoc(yjsDoc, (live) => {
      if (applyingYjs.current) return;
      const local = nodesRef.current;
      const merged = mergeRemoteNodes(local, live.nodes);
      const draggingIds = new Set(local.filter((n) => n.dragging).map((n) => n.id));
      const prevById = new Map(prevNodes.current.map((n) => [n.id, n]));
      prevNodes.current = merged.map((n) =>
        draggingIds.has(n.id) ? (prevById.get(n.id) ?? n) : n,
      );
      setNodes(merged);
      setEdges(live.edges);
      setComments(live.comments);
    });
  }, [yjsTransport, yjsMode, yjsDoc, isCollaborating, setNodes, setEdges, setComments]);

  const yjsWriteSig = useMemo(() => {
    if (!yjsTransport || yjsMode !== 'transport') return '';
    const dragging = nodes.some((n) => n.dragging);
    if (dragging) return '';
    return docSignature(nodes, edges, comments);
  }, [yjsTransport, yjsMode, nodes, edges, comments]);

  useEffect(() => {
    if (!yjsWriteSig || !yjsDoc) return;
    applyingYjs.current = true;
    writeCanvasDoc(yjsDoc, { nodes, edges, comments });
    applyingYjs.current = false;
  }, [yjsWriteSig, yjsDoc, nodes, edges, comments]);

  const selKey = useMemo(
    () =>
      nodes
        .filter((n) => n.selected)
        .map((n) => n.id)
        .sort()
        .join(','),
    [nodes],
  );
  useEffect(() => {
    if (!isCollaborating) return;
    broadcastSelection(selKey ? selKey.split(',') : []);
  }, [selKey, isCollaborating, broadcastSelection]);
}
