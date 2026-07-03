import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { AuthProvider, useAuth } from '../../games/data/AuthProvider';
import { GameRoomProvider, useGameRoom } from '@/shell/realtime';
import { RoomCommsProvider } from '../../games/net/useRoomComms';
import { fetchNewRoomCode, makeRoomCode, normalizeRoomCode } from '@/shell/realtime';
import type { RoomStatus } from '@/shell/realtime';
import type { Peer, Role } from '@/shell/realtime';
import { collabSession, defaultSession, interviewSession, type SessionMeta } from '@/lib/session';
import { extractSessionMeta } from '@/shell/realtime/roomState';
import {
  CANVAS_TAG,
  isCanvasOp,
  isEditOp,
  peerColor,
  type CanvasComment,
  type CanvasCommentReply,
  type CanvasOp,
  type EditOp,
} from './collabProtocol';
import { isQuizOp, toHostQuizEntry, type HostQuizEntry } from './quizProtocol';

/** Live, ephemeral state for one remote collaborator. */
export interface PeerPresence {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  selection: string[];
  viewport?: { x: number; y: number; zoom: number };
  /** nodeId → live drag position + timestamp while a peer is dragging it. */
  drags: Record<string, { x: number; y: number; at: number }>;
  lastSeen: number;
}

export interface CanvasCollabApi {
  // ---- session ----
  status: RoomStatus;
  room: string | null;
  role: Role | null;
  self: Peer | null;
  players: Peer[];
  isCollaborating: boolean;
  isHost: boolean;
  /** Active session metadata (solo when not in a room). */
  session: SessionMeta;
  /** Mint a fresh room and host it. */
  startSession: (name?: string) => Promise<string | null>;
  /** Host an interview room with a shared problem (scaffold). */
  startInterviewSession: (problemId: string, name?: string) => Promise<string | null>;
  /** Join an existing room by code. */
  joinSession: (code: string, name?: string) => void;
  leaveSession: () => void;

  // ---- presence ----
  peers: PeerPresence[];
  followId: string | null;
  setFollowId: (id: string | null) => void;
  /** Throttled local-presence broadcasters, called from the canvas pane. */
  broadcastCursor: (x: number, y: number) => void;
  broadcastSelection: (ids: string[]) => void;
  broadcastViewport: (v: { x: number; y: number; zoom: number }) => void;
  broadcastDrag: (id: string, x: number, y: number) => void;

  // ---- comments ----
  comments: CanvasComment[];
  addComment: (x: number, y: number, text: string) => void;
  replyComment: (id: string, text: string) => void;
  resolveComment: (id: string, resolved: boolean) => void;
  removeComment: (id: string) => void;

  /** Host-only: quiz answers relayed from guests during interview sessions. */
  hostQuizLog: HostQuizEntry[];

  // ---- internal wiring (used by the in-canvas doc-sync hook) ----
  /** Send a raw op over the relay (gated: hosts publish state instead of edit ops). */
  emit: (op: CanvasOp) => void;
  /** Comment state owned here but reconciled by the host doc snapshot. */
  setComments: Dispatch<SetStateAction<CanvasComment[]>>;
}

const CanvasCollabContext = createContext<CanvasCollabApi | null>(null);

const PRESENCE_MS = 45; // ~22 fps, under the relay's 20/s sustained budget per kind
let cseq = 0;
const cid = () => `c${Date.now().toString(36)}${(cseq++).toString(36)}`;

function CollabState({ children }: { children: ReactNode }) {
  const { status, room, role, self, players, send, subscribe, connect, disconnect, sharedState } = useGameRoom();
  const { profile } = useAuth();

  const [peerMap, setPeerMap] = useState<Record<string, PeerPresence>>({});
  const [followId, setFollowId] = useState<string | null>(null);
  const [comments, setComments] = useState<CanvasComment[]>([]);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta>(() => defaultSession('solo'));
  const [hostQuizLog, setHostQuizLog] = useState<HostQuizEntry[]>([]);

  const isHost = role === 'host';
  const isCollaborating = status === 'open' && room != null;
  const selfName = self?.name ?? profile?.display_name ?? 'You';

  // Guests mirror session metadata from the host envelope.
  useEffect(() => {
    if (isHost || !isCollaborating) return;
    setSessionMeta(extractSessionMeta(sharedState));
  }, [sharedState, isHost, isCollaborating]);

  // Roster order → stable peer color assignment shared across clients.
  const colorForRef = useRef<(id: string) => string>(() => peerColor('', -1));
  colorForRef.current = (id: string) => {
    const order = [...players].sort((a, b) => a.id.localeCompare(b.id));
    return peerColor(id, order.findIndex((p) => p.id === id));
  };

  // ---- inbound relay: presence only (edits/doc are applied by the sync hook) ----
  useEffect(() => {
    return subscribe((data, fromId) => {
      if (isQuizOp(data)) {
        if (isHost && isCollaborating) {
          const name = players.find((p) => p.id === fromId)?.name ?? 'Peer';
          setHostQuizLog((log) => [...log, toHostQuizEntry(data, fromId, name)]);
        }
        return;
      }
      if (!isCanvasOp(data)) return;
      const op = data as CanvasOp;
      if (isEditOp(op)) return; // handled by useCanvasDocSync on the host
      const name = players.find((p) => p.id === fromId)?.name ?? 'Peer';
      switch (op[CANVAS_TAG]) {
        case 'presence-request':
          return; // answered by the broadcasters below via their own effects
        case 'cursor':
          setPeerMap((m) => ({ ...m, [fromId]: patchPeer(m[fromId], fromId, name, colorForRef.current(fromId), { cursor: { x: op.x, y: op.y } }) }));
          break;
        case 'selection':
          setPeerMap((m) => ({ ...m, [fromId]: patchPeer(m[fromId], fromId, name, colorForRef.current(fromId), { selection: op.ids }) }));
          break;
        case 'viewport':
          setPeerMap((m) => ({ ...m, [fromId]: patchPeer(m[fromId], fromId, name, colorForRef.current(fromId), { viewport: { x: op.x, y: op.y, zoom: op.zoom } }) }));
          break;
        case 'drag':
          setPeerMap((m) => {
            const prev = m[fromId];
            const drags = { ...(prev?.drags ?? {}), [op.id]: { x: op.x, y: op.y, at: Date.now() } };
            return { ...m, [fromId]: patchPeer(prev, fromId, name, colorForRef.current(fromId), { drags }) };
          });
          break;
      }
    });
  }, [subscribe, players, isHost, isCollaborating]);

  // Prune presence for peers who left; clear all when we disconnect.
  useEffect(() => {
    if (!isCollaborating) {
      setPeerMap({});
      setFollowId(null);
      setHostQuizLog([]);
      return;
    }
    const live = new Set(players.map((p) => p.id));
    setPeerMap((m) => {
      const next: Record<string, PeerPresence> = {};
      for (const [id, p] of Object.entries(m)) if (live.has(id) && id !== self?.id) next[id] = p;
      return next;
    });
  }, [players, isCollaborating, self?.id]);

  // Live drags carry no end signal — expire a ghost once its frames stop.
  useEffect(() => {
    if (!isCollaborating) return;
    const iv = setInterval(() => {
      const cutoff = Date.now() - 500;
      setPeerMap((m) => {
        let changed = false;
        const next: Record<string, PeerPresence> = {};
        for (const [id, p] of Object.entries(m)) {
          const kept = Object.entries(p.drags).filter(([, d]) => d.at >= cutoff);
          if (kept.length !== Object.keys(p.drags).length) {
            changed = true;
            next[id] = { ...p, drags: Object.fromEntries(kept) };
          } else {
            next[id] = p;
          }
        }
        return changed ? next : m;
      });
    }, 400);
    return () => clearInterval(iv);
  }, [isCollaborating]);

  // ---- outbound presence (throttled per kind) ----
  const lastSent = useRef<Record<string, number>>({});
  const emit = useCallback((op: CanvasOp) => {
    // Hosts are the document authority and publish state; they never emit edits.
    if (isEditOp(op) && (role === 'host' || role === 'spectator')) return;
    send(op);
  }, [send, role]);

  const throttled = useCallback(
    (kind: string, op: CanvasOp) => {
      const now = Date.now();
      if (now - (lastSent.current[kind] ?? 0) < PRESENCE_MS) return;
      lastSent.current[kind] = now;
      send(op);
    },
    [send],
  );

  const broadcastCursor = useCallback((x: number, y: number) => throttled('cursor', { [CANVAS_TAG]: 'cursor', x, y }), [throttled]);
  const broadcastSelection = useCallback((ids: string[]) => send({ [CANVAS_TAG]: 'selection', ids }), [send]);
  const broadcastViewport = useCallback((v: { x: number; y: number; zoom: number }) => throttled('viewport', { [CANVAS_TAG]: 'viewport', ...v }), [throttled]);
  const broadcastDrag = useCallback((id: string, x: number, y: number) => throttled('drag', { [CANVAS_TAG]: 'drag', id, x, y }), [throttled]);

  // ---- session controls ----
  const startSession = useCallback(async (name?: string): Promise<string | null> => {
    setSessionMeta(collabSession());
    let code: string | null = null;
    try {
      code = await fetchNewRoomCode();
    } catch {
      code = makeRoomCode();
    }
    if (!code) return null;
    connect(code, name?.trim() || selfName, { capacity: 8 });
    return code;
  }, [connect, selfName]);

  const startInterviewSession = useCallback(async (problemId: string, name?: string): Promise<string | null> => {
    setSessionMeta(interviewSession(problemId));
    let code: string | null = null;
    try {
      code = await fetchNewRoomCode();
    } catch {
      code = makeRoomCode();
    }
    if (!code) return null;
    connect(code, name?.trim() || selfName, { capacity: 8 });
    return code;
  }, [connect, selfName]);

  const joinSession = useCallback((code: string, name?: string) => {
    const norm = normalizeRoomCode(code);
    if (norm.length < 4) return;
    connect(norm, name?.trim() || selfName, { capacity: 8 });
  }, [connect, selfName]);

  const leaveSession = useCallback(() => {
    disconnect();
    setPeerMap({});
    setComments([]);
    setFollowId(null);
    setHostQuizLog([]);
    setSessionMeta(defaultSession('solo'));
  }, [disconnect]);

  // ---- comment actions (optimistic locally; folded by the host doc) ----
  const emitEdit = useCallback((op: EditOp) => emit(op), [emit]);

  const addComment = useCallback((x: number, y: number, text: string) => {
    const body = text.trim();
    if (!body || !self) return;
    const comment: CanvasComment = {
      id: cid(), authorId: self.id, authorName: self.name, text: body, x, y, at: Date.now(), resolved: false, replies: [],
    };
    setComments((cs) => [...cs, comment]);
    emitEdit({ [CANVAS_TAG]: 'comment-add', comment });
  }, [self, emitEdit]);

  const replyComment = useCallback((id: string, text: string) => {
    const body = text.trim();
    if (!body || !self) return;
    const reply: CanvasCommentReply = { id: cid(), authorId: self.id, authorName: self.name, text: body, at: Date.now() };
    setComments((cs) => cs.map((c) => (c.id === id ? { ...c, replies: [...c.replies, reply] } : c)));
    emitEdit({ [CANVAS_TAG]: 'comment-reply', id, reply });
  }, [self, emitEdit]);

  const resolveComment = useCallback((id: string, resolved: boolean) => {
    setComments((cs) => cs.map((c) => (c.id === id ? { ...c, resolved } : c)));
    emitEdit({ [CANVAS_TAG]: 'comment-resolve', id, resolved });
  }, [emitEdit]);

  const removeComment = useCallback((id: string) => {
    setComments((cs) => cs.filter((c) => c.id !== id));
    emitEdit({ [CANVAS_TAG]: 'comment-remove', id });
  }, [emitEdit]);

  const peers = useMemo(() => Object.values(peerMap), [peerMap]);

  const value = useMemo<CanvasCollabApi>(
    () => ({
      status, room, role, self, players, isCollaborating, isHost,
      session: sessionMeta,
      startSession, startInterviewSession, joinSession, leaveSession,
      peers, followId, setFollowId,
      broadcastCursor, broadcastSelection, broadcastViewport, broadcastDrag,
      comments, addComment, replyComment, resolveComment, removeComment,
      hostQuizLog,
      emit, setComments,
    }),
    [
      status, room, role, self, players, isCollaborating, isHost,
      sessionMeta,
      startSession, startInterviewSession, joinSession, leaveSession,
      peers, followId,
      broadcastCursor, broadcastSelection, broadcastViewport, broadcastDrag,
      comments, addComment, replyComment, resolveComment, removeComment,
      hostQuizLog,
      emit,
    ],
  );

  return <CanvasCollabContext.Provider value={value}>{children}</CanvasCollabContext.Provider>;
}

function patchPeer(
  prev: PeerPresence | undefined,
  id: string,
  name: string,
  color: string,
  patch: Partial<PeerPresence>,
): PeerPresence {
  return {
    id,
    name,
    color,
    selection: prev?.selection ?? [],
    drags: prev?.drags ?? {},
    cursor: prev?.cursor,
    viewport: prev?.viewport,
    ...patch,
    lastSeen: Date.now(),
  };
}

/**
 * Wraps the canvas subtree with the collaboration relay stack (auth → room →
 * comms) and the collaboration state. When no session is active every consumer
 * reports `isCollaborating === false` and nothing touches the network, so
 * single-user behavior is unchanged.
 */
export function CanvasCollabProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <GameRoomProvider>
        <RoomCommsProvider>
          <CollabState>{children}</CollabState>
        </RoomCommsProvider>
      </GameRoomProvider>
    </AuthProvider>
  );
}

export function useCanvasCollab(): CanvasCollabApi {
  const ctx = useContext(CanvasCollabContext);
  if (!ctx) throw new Error('useCanvasCollab must be used within a CanvasCollabProvider');
  return ctx;
}

/** Non-throwing variant for widgets that may render outside a collab session. */
export function useCanvasCollabOptional(): CanvasCollabApi | null {
  return useContext(CanvasCollabContext);
}
