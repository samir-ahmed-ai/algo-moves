import { useEffect, useMemo, useRef } from 'react';
import type { Edge } from '@xyflow/react';
import { useGameRoom } from '@/shell/realtime';
import { usePublishState } from '@/shell/realtime';
import { buildCanvasRoomState, extractCanvasDoc } from '@/shell/realtime/roomState';
import { useCanvasCollab } from '../CanvasCollabProvider';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import { isCanvasOp, isEditOp, type CanvasDoc, type CanvasOp } from '../protocol/collabProtocol';
import {
  applyEditToComments,
  applyEditToEdges,
  applyEditToNodes,
  diffEdges,
  diffNodes,
  docSignature,
  mergeRemoteNodes,
} from '../protocol/canvasDoc';
import { canMoveCanvasNodes } from '../protocol/subdocPermissions';
import { subDocSignature, type SubDocKind, type SubDocPayload } from '../protocol/subdocProtocol';
import { snapshotFromPayload } from '../protocol/subdocMerge';

type SetNodes = (u: PanelFlowNode[] | ((prev: PanelFlowNode[]) => PanelFlowNode[])) => void;
type SetEdges = (u: Edge[] | ((prev: Edge[]) => Edge[])) => void;

interface DocSyncArgs {
  nodes: PanelFlowNode[];
  edges: Edge[];
  setNodes: SetNodes;
  setEdges: SetEdges;
}

/**
 * Binds the live canvas document to the room. Call once inside the canvas,
 * passing ReactFlow's state and setters. When no session is active it is inert.
 *
 * Roles:
 *  - HOST publishes the whole `{nodes, edges, comments}` document into the
 *    room's authoritative state whenever it settles (never mid-drag).
 *  - Non-host editors translate their local node/edge diffs into ops the host
 *    folds in; they reconcile to each inbound host snapshot, keeping their own
 *    in-progress drag and per-panel interior state.
 *  - Everyone broadcasts their live drags as ephemeral presence.
 */
export function useCanvasDocSync({ nodes, edges, setNodes, setEdges }: DocSyncArgs): void {
  const { role, isCollaborating, session, comments, setComments, emit, broadcastDrag, broadcastSelection, subDocs, setSubDocs } = useCanvasCollab();
  const { publishState, subscribe, sharedState } = useGameRoom();

  const isHost = role === 'host';
  const prevNodes = useRef<PanelFlowNode[]>(nodes);
  const prevEdges = useRef<Edge[]>(edges);
  const revRef = useRef(0);
  const seededSubDocs = useRef(false);

  // Fresh mirrors so the host publisher reads current state without re-binding.
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const subDocsRef = useRef(subDocs);
  subDocsRef.current = subDocs;

  const canMoveNodes = canMoveCanvasNodes({ role, session, isCollaborating });

  // Seed subDocs from existing node.data.subDoc when host starts a session
  useEffect(() => {
    if (!isHost || !isCollaborating || seededSubDocs.current) return;
    seededSubDocs.current = true;
    const initial: Record<string, ReturnType<typeof snapshotFromPayload>> = {};
    const subDocKinds = new Set(['whiteboard', 'collab-code']);
    for (const n of nodesRef.current) {
      const kind = n.data?.kind;
      const sub = n.data?.subDoc;
      if (kind && subDocKinds.has(kind) && sub?.payload) {
        initial[n.id] = snapshotFromPayload(n.id, kind as SubDocKind, sub.rev ?? 0, sub.payload as SubDocPayload);
      }
    }
    if (Object.keys(initial).length > 0) {
      setSubDocs((prev) => ({ ...initial, ...prev }));
    }
  }, [isHost, isCollaborating, setSubDocs]);

  // Reset seed flag when leaving session
  useEffect(() => {
    if (!isCollaborating) seededSubDocs.current = false;
  }, [isCollaborating]);

  // ---- host: publish the authoritative document on every settled change ----
  const sig = isCollaborating && isHost ? docSignature(nodes, edges, comments) : '';
  const subSig = isCollaborating && isHost ? subDocSignature(subDocs) : '';
  const interviewSig = session.interview ? JSON.stringify(session.interview) : '';
  const runtimeSig = session.interviewRuntime ? JSON.stringify(session.interviewRuntime) : '';
  // Interview runtime (timer/lock/follow) must publish even on an empty board.
  const isInterview = session.kind === 'interview';
  usePublishState(
    isHost && isCollaborating,
    [sig, subSig, session.kind, session.activeProblemId, interviewSig, runtimeSig],
    () => {
      if (!sig && !subSig && !isInterview) return;
      revRef.current += 1;
      const doc: CanvasDoc = {
        v: 1,
        rev: revRef.current,
        nodes: nodesRef.current,
        edges: edgesRef.current,
        removedPanels: [],
        removedEdges: [],
        comments: commentsRef.current,
      };
      publishState(buildCanvasRoomState(session, doc, subDocsRef.current));
    },
  );

  // ---- non-host: reconcile to the host snapshot (also seeds late joiners) ----
  // Applying the snapshot also advances the emission baselines to it, so applied
  // remote changes are never re-emitted. A node the local user is actively
  // dragging keeps its pre-drag baseline, so its eventual settle still produces
  // exactly one move op.
  useEffect(() => {
    if (isHost || !isCollaborating) return;
    const doc = extractCanvasDoc(sharedState);
    if (!doc) return;
    const local = nodesRef.current;
    const merged = mergeRemoteNodes(local, doc.nodes);
    const draggingIds = new Set(local.filter((n) => n.dragging).map((n) => n.id));
    const prevById = new Map(prevNodes.current.map((n) => [n.id, n]));
    prevNodes.current = merged.map((n) => (draggingIds.has(n.id) ? prevById.get(n.id) ?? n : n));
    setNodes(merged);
    prevEdges.current = doc.edges;
    setEdges(doc.edges);
    setComments(doc.comments);
  }, [sharedState, isHost, isCollaborating, setNodes, setEdges, setComments]);

  // ---- host: fold peer edit ops into the canonical document ----
  useEffect(() => {
    if (!isHost) return;
    return subscribe((data) => {
      if (!isCanvasOp(data)) return;
      const op = data as CanvasOp;
      if (!isEditOp(op)) return;
      setNodes((nds) => applyEditToNodes(op, nds));
      setEdges((eds) => applyEditToEdges(op, eds));
      setComments((cs) => applyEditToComments(op, cs));
    });
  }, [subscribe, isHost, setNodes, setEdges, setComments]);

  // ---- everyone: broadcast live drags; non-hosts emit settled diffs ----
  useEffect(() => {
    if (!isCollaborating) {
      prevNodes.current = nodes;
      return;
    }
    const dragging = nodes.filter((n) => n.dragging);
    for (const n of dragging) broadcastDrag(n.id, n.position.x, n.position.y);
    if (dragging.length) return; // don't diff mid-drag — the settle emits one move

    if (isHost) {
      prevNodes.current = nodes;
      return;
    }
    if (!canMoveNodes) {
      prevNodes.current = nodes;
      return;
    }
    const ops = diffNodes(prevNodes.current, nodes);
    prevNodes.current = nodes;
    for (const op of ops) emit(op);
  }, [nodes, isCollaborating, isHost, emit, broadcastDrag, canMoveNodes]);

  useEffect(() => {
    if (!isCollaborating || isHost || !canMoveNodes) {
      prevEdges.current = edges;
      return;
    }
    const ops = diffEdges(prevEdges.current, edges);
    prevEdges.current = edges;
    for (const op of ops) emit(op);
  }, [edges, isCollaborating, isHost, emit, canMoveNodes]);

  // ---- everyone: broadcast the local selection so peers can see it ----
  const selKey = useMemo(
    () => nodes.filter((n) => n.selected).map((n) => n.id).sort().join(','),
    [nodes],
  );
  useEffect(() => {
    if (!isCollaborating) return;
    broadcastSelection(selKey ? selKey.split(',') : []);
  }, [selKey, isCollaborating, broadcastSelection]);
}
