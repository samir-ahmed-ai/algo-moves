/**
 * Legacy host-authoritative canvas relay — edit-ops over the Go WebSocket hub.
 * Used when `VITE_HOCUSPOCUS_URL` is unset. Delete once Hocuspocus is required.
 */
import { useEffect, useRef } from 'react';
import type { Edge } from '@xyflow/react';
import { extractCanvasDoc } from '@/shell/realtime/roomState';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import type { CanvasComment } from '../protocol/collabProtocol';
import { isCanvasOp, isEditOp, type CanvasOp } from '../protocol/collabProtocol';
import {
  applyEditToComments,
  applyEditToEdges,
  applyEditToNodes,
  diffEdges,
  diffNodes,
  mergeRemoteNodes,
} from '../protocol/canvasDoc';
import { canMoveCanvasNodes } from '../protocol/subdocPermissions';
import type { SessionMeta } from '@/lib/session';
import type { Role } from '@/shell/realtime';

type SetNodes = (u: PanelFlowNode[] | ((prev: PanelFlowNode[]) => PanelFlowNode[])) => void;
type SetEdges = (u: Edge[] | ((prev: Edge[]) => Edge[])) => void;
type SetComments = (u: CanvasComment[] | ((prev: CanvasComment[]) => CanvasComment[])) => void;

interface LegacyRelayArgs {
  enabled: boolean;
  isHost: boolean;
  role: Role | null;
  isCollaborating: boolean;
  session: SessionMeta;
  nodes: PanelFlowNode[];
  edges: Edge[];
  setNodes: SetNodes;
  setEdges: SetEdges;
  setComments: SetComments;
  sharedState: unknown;
  subscribe: (fn: (data: unknown) => void) => () => void;
  emit: (op: CanvasOp) => void;
  broadcastDrag: (id: string, x: number, y: number) => void;
}

export function useLegacyCanvasDocRelay({
  enabled,
  isHost,
  role,
  isCollaborating,
  session,
  nodes,
  edges,
  setNodes,
  setEdges,
  setComments,
  sharedState,
  subscribe,
  emit,
  broadcastDrag,
}: LegacyRelayArgs): void {
  const prevNodes = useRef(nodes);
  const prevEdges = useRef(edges);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const canMoveNodes = canMoveCanvasNodes({ role, session, isCollaborating });

  useEffect(() => {
    if (!enabled || isHost || !isCollaborating) return;
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
  }, [enabled, sharedState, isHost, isCollaborating, setNodes, setEdges, setComments]);

  useEffect(() => {
    if (!enabled || !isHost) return;
    return subscribe((data) => {
      if (!isCanvasOp(data)) return;
      const op = data as CanvasOp;
      if (!isEditOp(op)) return;
      setNodes((nds) => applyEditToNodes(op, nds));
      setEdges((eds) => applyEditToEdges(op, eds));
      setComments((cs) => applyEditToComments(op, cs));
    });
  }, [enabled, subscribe, isHost, setNodes, setEdges, setComments]);

  useEffect(() => {
    if (!enabled || !isCollaborating) {
      prevNodes.current = nodes;
      return;
    }
    const dragging = nodes.filter((n) => n.dragging);
    for (const n of dragging) broadcastDrag(n.id, n.position.x, n.position.y);
    if (dragging.length) return;

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
  }, [enabled, nodes, isCollaborating, isHost, emit, broadcastDrag, canMoveNodes]);

  useEffect(() => {
    if (!enabled || !isCollaborating || isHost || !canMoveNodes) {
      prevEdges.current = edges;
      return;
    }
    const ops = diffEdges(prevEdges.current, edges);
    prevEdges.current = edges;
    for (const op of ops) emit(op);
  }, [enabled, edges, isCollaborating, isHost, emit, canMoveNodes]);
}
