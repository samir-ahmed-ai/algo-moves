import { useEffect, useMemo, useRef } from 'react';
import type { Edge } from '@xyflow/react';
import { useGameRoom } from '../../games/net/useGameRoom';
import { usePublishState } from '../../games/net/usePublishState';
import { useCanvasCollab } from './CanvasCollabProvider';
import type { PanelFlowNode } from '../PanelNode';
import { isCanvasOp, isEditOp, type CanvasDoc, type CanvasOp } from './collabProtocol';
import {
  applyEditToComments,
  applyEditToEdges,
  applyEditToNodes,
  diffEdges,
  diffNodes,
  docSignature,
  isCanvasDoc,
  mergeRemoteNodes,
} from './canvasDoc';

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
  const { role, isCollaborating, comments, setComments, emit, broadcastDrag, broadcastSelection } = useCanvasCollab();
  const { publishState, subscribe, sharedState } = useGameRoom();

  const isHost = role === 'host';
  const prevNodes = useRef<PanelFlowNode[]>(nodes);
  const prevEdges = useRef<Edge[]>(edges);
  const revRef = useRef(0);

  // Fresh mirrors so the host publisher reads current state without re-binding.
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const commentsRef = useRef(comments);
  commentsRef.current = comments;

  // ---- host: publish the authoritative document on every settled change ----
  const sig = isCollaborating && isHost ? docSignature(nodes, edges, comments) : '';
  usePublishState(isHost && isCollaborating, [sig], () => {
    if (!sig) return;
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
    publishState(doc);
  });

  // ---- non-host: reconcile to the host snapshot (also seeds late joiners) ----
  // Applying the snapshot also advances the emission baselines to it, so applied
  // remote changes are never re-emitted. A node the local user is actively
  // dragging keeps its pre-drag baseline, so its eventual settle still produces
  // exactly one move op.
  useEffect(() => {
    if (isHost || !isCollaborating) return;
    if (!isCanvasDoc(sharedState)) return;
    const local = nodesRef.current;
    const merged = mergeRemoteNodes(local, sharedState.nodes);
    const draggingIds = new Set(local.filter((n) => n.dragging).map((n) => n.id));
    const prevById = new Map(prevNodes.current.map((n) => [n.id, n]));
    prevNodes.current = merged.map((n) => (draggingIds.has(n.id) ? prevById.get(n.id) ?? n : n));
    setNodes(merged);
    prevEdges.current = sharedState.edges;
    setEdges(sharedState.edges);
    setComments(sharedState.comments);
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
    const ops = diffNodes(prevNodes.current, nodes);
    prevNodes.current = nodes;
    for (const op of ops) emit(op);
  }, [nodes, isCollaborating, isHost, emit, broadcastDrag]);

  useEffect(() => {
    if (!isCollaborating || isHost) {
      prevEdges.current = edges;
      return;
    }
    const ops = diffEdges(prevEdges.current, edges);
    prevEdges.current = edges;
    for (const op of ops) emit(op);
  }, [edges, isCollaborating, isHost, emit]);

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
