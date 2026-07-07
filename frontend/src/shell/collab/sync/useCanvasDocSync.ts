import { useEffect, useMemo, useRef } from 'react';
import type { Edge } from '@xyflow/react';
import { useGameRoom } from '@/shell/realtime';
import { usePublishState } from '@/shell/realtime';
import {
  buildRoomEnvelope,
  buildSessionRoomState,
  extractCanvasDoc,
  type RoomSharedEnvelope,
} from '@/shell/realtime/roomState';
import { useCanvasCollab } from '../CanvasCollabProvider';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import type { CanvasDoc } from '../protocol/collabProtocol';
import { docSignature, mergeRemoteNodes } from '../protocol/canvasDoc';
import { subDocSignature, type SubDocKind, type SubDocPayload } from '../protocol/subdocProtocol';
import { snapshotFromPayload } from '../protocol/subdocMerge';
import { observeCanvasDoc, writeCanvasDoc } from '../yjs/yjsCanvasBinding';
import { useYjsCollab } from '../yjs/YjsCollabContext';
import { useYjsForCanvasGraph, useYjsForSubdocs } from '../yjs/yjsConfig';

/** Trailing debounce for relay-fallback content publishes (20 msg/s room budget). */
const CONTENT_PUBLISH_MS = 300;

const SUBDOC_KINDS = new Set<string>(['whiteboard', 'collab-code', 'notes']);

type SetNodes = (u: PanelFlowNode[] | ((prev: PanelFlowNode[]) => PanelFlowNode[])) => void;
type SetEdges = (u: Edge[] | ((prev: Edge[]) => Edge[])) => void;

interface DocSyncArgs {
  nodes: PanelFlowNode[];
  edges: Edge[];
  setNodes: SetNodes;
  setEdges: SetEdges;
  /** When false (a locked-out/restricted guest) local graph edits are not written to the shared doc. */
  canModifyCanvas?: boolean;
}

/**
 * Binds the live canvas document to Yjs/Hocuspocus when that transport is on.
 * On the relay-only fallback (no Yjs) the host publishes the full room state
 * (session + canvas + subDocs) so guests still receive content changes.
 */
export function useCanvasDocSync({
  nodes,
  edges,
  setNodes,
  setEdges,
  canModifyCanvas = true,
}: DocSyncArgs): void {
  const {
    role,
    isCollaborating,
    session,
    comments,
    setComments,
    broadcastSelection,
    subDocs,
    setSubDocs,
  } = useCanvasCollab();
  const { publishState, sharedState } = useGameRoom();
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
  const subDocsRef = useRef(subDocs);
  subDocsRef.current = subDocs;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (!isHost || !isCollaborating || seededSubDocs.current) return;
    seededSubDocs.current = true;
    const initial: Record<string, ReturnType<typeof snapshotFromPayload>> = {};
    for (const n of nodesRef.current) {
      const kind = n.data?.kind;
      const sub = n.data?.subDoc;
      if (kind && SUBDOC_KINDS.has(kind) && sub?.payload) {
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

  // Content channels that must ride the relay envelope because Yjs is off.
  const relayCanvas = !useYjsForCanvasGraph();
  const relaySubdocs = !useYjsForSubdocs();
  const relayContent = relayCanvas || relaySubdocs;

  const canvasRevRef = useRef(0);
  const buildEnvelope = (): RoomSharedEnvelope => {
    if (!relayContent) return buildSessionRoomState(sessionRef.current);
    const canvas: CanvasDoc | undefined = relayCanvas
      ? {
          v: 1,
          rev: ++canvasRevRef.current,
          nodes: nodesRef.current,
          edges: edgesRef.current,
          removedPanels: [],
          removedEdges: [],
          comments: commentsRef.current,
        }
      : undefined;
    return buildRoomEnvelope(sessionRef.current, {
      ...(relayCanvas && canvas ? { canvas } : {}),
      ...(relaySubdocs ? { subDocs: subDocsRef.current } : {}),
    });
  };
  const publishRef = useRef(() => {});
  publishRef.current = () => publishState(buildEnvelope());

  // Session metadata (timer/lock/follow) publishes immediately; in relay
  // fallback the envelope always carries content too so late joiners replay it.
  usePublishState(isHost && isCollaborating, [sessionPublishKey], () => {
    publishRef.current();
  });

  // Content changes (canvas graph, sub-docs) publish debounced on the fallback.
  const contentSig = useMemo(() => {
    if (!relayContent) return '';
    const canvasSig = relayCanvas ? docSignature(nodes, edges, comments) : '';
    const subSig = relaySubdocs ? subDocSignature(subDocs) : '';
    return `${canvasSig}~${subSig}`;
  }, [relayContent, relayCanvas, relaySubdocs, nodes, edges, comments, subDocs]);

  useEffect(() => {
    if (!isHost || !isCollaborating || !relayContent) return;
    const t = setTimeout(() => publishRef.current(), CONTENT_PUBLISH_MS);
    return () => clearTimeout(t);
  }, [contentSig, isHost, isCollaborating, relayContent]);

  // Guest side of the fallback: mirror the host's canvas doc from the envelope.
  const appliedCanvasRev = useRef(0);
  useEffect(() => {
    if (!isCollaborating) {
      appliedCanvasRev.current = 0;
      canvasRevRef.current = 0;
    }
  }, [isCollaborating]);

  useEffect(() => {
    if (isHost || !isCollaborating || !relayCanvas) return;
    const remote = extractCanvasDoc(sharedState);
    if (!remote || remote.rev <= appliedCanvasRev.current) return;
    appliedCanvasRev.current = remote.rev;
    const merged = mergeRemoteNodes(nodesRef.current, remote.nodes);
    prevNodes.current = merged;
    setNodes(merged);
    setEdges(remote.edges);
    setComments(remote.comments);
  }, [sharedState, isHost, isCollaborating, relayCanvas, setNodes, setEdges, setComments]);

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
    // A restricted guest must not push graph mutations into the shared doc
    // (add/delete/move) — the board lock would otherwise be bypassed.
    if (!canModifyCanvas) return '';
    const dragging = nodes.some((n) => n.dragging);
    if (dragging) return '';
    return docSignature(nodes, edges, comments);
  }, [yjsTransport, yjsMode, canModifyCanvas, nodes, edges, comments]);

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
