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
import { useAuth } from '@/shell/auth/AuthProvider';
import { GameRoomProvider, useGameRoom, RoomCommsProvider } from '@/shell/realtime';
import { fetchNewRoomCode, makeRoomCode, normalizeRoomCode } from '@/shell/realtime';
import type { RoomStatus } from '@/shell/realtime';
import type { Peer, Role } from '@/shell/realtime';
import {
  collabSession,
  defaultSession,
  defaultInterviewRuntime,
  emptyTimerState,
  type InterviewRuntime,
  type InterviewSettings,
  type SessionMeta,
} from '@/lib/session';
import { extractSessionMeta } from '@/shell/realtime/roomState';
import { readRoomFromUrl, readShareFromUrl, writeShareToUrl } from '@/store/navigation/shareState';
import type { InterviewSummary } from '@/platform/api/interviewApi';
import {
  bootstrapHostInterviewSession,
  buildJoinInterviewSession,
  buildResumeInterviewSession,
  persistInterviewHostRoom,
} from '@/shell/interview/interviewSession';
import { clearInterviewHost } from '@/shell/interview/interviewHost';
import { canEditSubDoc } from './protocol/subdocPermissions';
import {
  CANVAS_TAG,
  isCanvasOp,
  isEditOp,
  peerColor,
  type CanvasComment,
  type CanvasCommentReply,
  type CanvasOp,
  type EditOp,
} from './protocol/collabProtocol';
import {
  SUBDOC_TAG,
  emptyEditorPayload,
  emptyWhiteboardPayload,
  isSubDocEditOp,
  isSubDocOp,
  type SubDocOp,
  type SubDocSnapshot,
  type WhiteboardPayload,
  type EditorPayload,
} from './protocol/subdocProtocol';
import {
  applyEditorPatch,
  applyWhiteboardPatch,
  snapshotFromPayload,
} from './protocol/subdocMerge';
import { extractSubDocs } from '@/shell/realtime/roomState';
import { isQuizOp, toHostQuizEntry, type HostQuizEntry } from './protocol/quizProtocol';
import { useYjsForCanvasGraph, useYjsForSubdocs } from './yjs/yjsConfig';
import { YjsCollabProvider } from './yjs/YjsCollabContext';
import { useYjsCanvasCollab } from './yjs/useYjsCanvasCollab';
import { SoloFallbackBanner } from './SoloFallbackBanner';

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
  /** Host an interview room with a shared problem. */
  startInterviewSession: (problemId: string, name?: string) => Promise<string | null>;
  /** Join an existing room by code. */
  joinSession: (code: string, name?: string) => void;
  leaveSession: () => void;
  /** Host-only: update interview permission settings (publishes to guests). */
  updateInterviewSettings: (patch: Partial<InterviewSettings>) => void;
  /** Reconnect to a saved interview session (reuses its room + guest token). */
  resumeInterviewSession: (row: InterviewSummary, name?: string) => void;

  // ---- interview facilitation (host-only mutators; all clients read runtime) ----
  /** Start the shared countdown for `durationMs` (sets it as the full length). */
  startTimer: (durationMs: number) => void;
  pauseTimer: () => void;
  /** Resume a paused timer, preserving its original full duration. */
  resumeTimer: () => void;
  resetTimer: () => void;
  /** Lock the board — guests become view-only. */
  setLocked: (locked: boolean) => void;
  /** Toggle "follow me" — guests mirror the host viewport. */
  setHostFollow: (on: boolean) => void;
  /** Classroom mode — guests mirror the host scrubber on viz panels. */
  setHostFrameFollow: (on: boolean) => void;
  /** Host-only: patch live interview runtime (timer/lock/follow/playback). */
  patchInterviewRuntime: (reduce: (r: InterviewRuntime) => InterviewRuntime) => void;
  /** True when interview cloud persistence is unavailable (relay-only fallback). */
  backendDegraded: boolean;
  dismissBackendBanner: () => void;
  /** Bind the live session to a durable REST session id / guest token. */
  setSessionIdentity: (p: { sessionId?: string; guestToken?: string }) => void;

  // ---- presence ----
  peers: PeerPresence[];
  followId: string | null;
  setFollowId: Dispatch<SetStateAction<string | null>>;
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

  /** Shared panel interiors (whiteboard scenes, collab editors) keyed by node id. */
  subDocs: Record<string, SubDocSnapshot>;
  setSubDocs: Dispatch<SetStateAction<Record<string, SubDocSnapshot>>>;
  /** Ephemeral in-panel cursors keyed by node id → peer id. */
  subDocCursors: Record<
    string,
    Record<string, { name: string; color: string; x: number; y: number; line?: number; at: number }>
  >;
  emitSubDoc: (op: SubDocOp) => void;

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
  const { status, room, role, self, players, send, subscribe, connect, disconnect, sharedState } =
    useGameRoom();
  const { profile } = useAuth();

  const [peerMap, setPeerMap] = useState<Record<string, PeerPresence>>({});
  const [followId, setFollowId] = useState<string | null>(null);
  const [comments, setComments] = useState<CanvasComment[]>([]);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta>(() => defaultSession('solo'));
  const [hostQuizLog, setHostQuizLog] = useState<HostQuizEntry[]>([]);
  const [subDocs, setSubDocs] = useState<Record<string, SubDocSnapshot>>({});
  const [subDocCursors, setSubDocCursors] = useState<
    Record<
      string,
      Record<
        string,
        { name: string; color: string; x: number; y: number; line?: number; at: number }
      >
    >
  >({});
  const [backendDegraded, setBackendDegraded] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const isHost = role === 'host';
  const isCollaborating = status === 'open' && room != null;
  const selfName = self?.name ?? profile?.display_name ?? 'You';

  // Guests mirror session metadata and sub-docs from the host envelope.
  useEffect(() => {
    if (isHost || !isCollaborating) return;
    setSessionMeta(extractSessionMeta(sharedState));
    const remoteSubDocs = extractSubDocs(sharedState);
    if (!useYjsForSubdocs() && Object.keys(remoteSubDocs).length > 0) {
      setSubDocs((prev) => ({ ...prev, ...remoteSubDocs }));
    }
  }, [sharedState, isHost, isCollaborating]);

  // Roster order → stable peer color assignment shared across clients.
  const colorForRef = useRef<(id: string) => string>(() => peerColor('', -1));
  colorForRef.current = (id: string) => {
    const order = [...players].sort((a, b) => a.id.localeCompare(b.id));
    return peerColor(
      id,
      order.findIndex((p) => p.id === id),
    );
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
      if (!isCanvasOp(data)) {
        if (isSubDocOp(data)) {
          const op = data;
          if (op[SUBDOC_TAG] === 'cursor') {
            const name = players.find((p) => p.id === fromId)?.name ?? 'Peer';
            setSubDocCursors((m) => ({
              ...m,
              [op.nodeId]: {
                ...(m[op.nodeId] ?? {}),
                [fromId]: {
                  name,
                  color: colorForRef.current(fromId),
                  x: op.x,
                  y: op.y,
                  line: op.line,
                  at: Date.now(),
                },
              },
            }));
            return;
          }
          if (!isHost || !isSubDocEditOp(op)) return;
          if (useYjsForSubdocs()) return;
          // Gate: reject guest patches when interview settings deny edit
          const senderRole = players.find((p) => p.id === fromId)?.role ?? 'guest';
          const patchKind =
            op[SUBDOC_TAG] === 'patch-editor' ? ('collab-code' as const) : ('whiteboard' as const);
          if (
            !canEditSubDoc(
              {
                role: senderRole as 'host' | 'guest' | 'spectator',
                session: sessionMeta,
                isCollaborating,
              },
              patchKind,
            )
          )
            return;
          setSubDocs((docs) => {
            if (op[SUBDOC_TAG] === 'snapshot') {
              return { ...docs, [op.doc.nodeId]: op.doc };
            }
            const nodeId = op.nodeId;
            const prev =
              docs[nodeId] ??
              snapshotFromPayload(
                nodeId,
                op[SUBDOC_TAG] === 'patch-editor' ? 'collab-code' : 'whiteboard',
                0,
                op[SUBDOC_TAG] === 'patch-editor' ? emptyEditorPayload() : emptyWhiteboardPayload(),
              );
            if (op[SUBDOC_TAG] === 'patch-whiteboard' && prev.kind === 'whiteboard') {
              return {
                ...docs,
                [nodeId]: snapshotFromPayload(
                  nodeId,
                  'whiteboard',
                  op.rev,
                  applyWhiteboardPatch(prev.payload as WhiteboardPayload, op),
                ),
              };
            }
            if (op[SUBDOC_TAG] === 'patch-editor') {
              const base =
                prev.kind === 'collab-code'
                  ? (prev.payload as EditorPayload)
                  : emptyEditorPayload();
              return {
                ...docs,
                [nodeId]: snapshotFromPayload(
                  nodeId,
                  'collab-code',
                  op.rev,
                  applyEditorPatch(base, op.text, op.language),
                ),
              };
            }
            return docs;
          });
        }
        return;
      }
      const op = data as CanvasOp;
      if (isEditOp(op)) return; // handled by useCanvasDocSync on the host
      const name = players.find((p) => p.id === fromId)?.name ?? 'Peer';
      switch (op[CANVAS_TAG]) {
        case 'presence-request':
          return; // answered by the broadcasters below via their own effects
        case 'cursor':
          setPeerMap((m) => ({
            ...m,
            [fromId]: patchPeer(m[fromId], fromId, name, colorForRef.current(fromId), {
              cursor: { x: op.x, y: op.y },
            }),
          }));
          break;
        case 'selection':
          setPeerMap((m) => ({
            ...m,
            [fromId]: patchPeer(m[fromId], fromId, name, colorForRef.current(fromId), {
              selection: op.ids,
            }),
          }));
          break;
        case 'viewport':
          setPeerMap((m) => ({
            ...m,
            [fromId]: patchPeer(m[fromId], fromId, name, colorForRef.current(fromId), {
              viewport: { x: op.x, y: op.y, zoom: op.zoom },
            }),
          }));
          break;
        case 'drag':
          setPeerMap((m) => {
            const prev = m[fromId];
            const drags = { ...(prev?.drags ?? {}), [op.id]: { x: op.x, y: op.y, at: Date.now() } };
            return {
              ...m,
              [fromId]: patchPeer(prev, fromId, name, colorForRef.current(fromId), { drags }),
            };
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
      setSubDocs({});
      setSubDocCursors({});
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

  // Prune stale sub-doc cursors (same cadence as drag expiry)
  useEffect(() => {
    if (!isCollaborating) return;
    const iv = setInterval(() => {
      const cutoff = Date.now() - 2000;
      setSubDocCursors((m) => {
        let changed = false;
        const next: typeof m = {};
        for (const [nodeId, peers] of Object.entries(m)) {
          const kept: typeof peers = {};
          for (const [pid, c] of Object.entries(peers)) {
            if (c.at >= cutoff) {
              kept[pid] = c;
            } else {
              changed = true;
            }
          }
          if (Object.keys(kept).length > 0) next[nodeId] = kept;
          else changed = true;
        }
        return changed ? next : m;
      });
    }, 500);
    return () => clearInterval(iv);
  }, [isCollaborating]);

  // ---- outbound presence (throttled per kind) ----
  const lastSent = useRef<Record<string, number>>({});
  const emit = useCallback(
    (op: CanvasOp) => {
      // Hosts are the document authority and publish state; they never emit edits.
      if (isEditOp(op) && (role === 'host' || role === 'spectator')) return;
      send(op);
    },
    [send, role],
  );

  const throttled = useCallback(
    (kind: string, op: CanvasOp) => {
      const now = Date.now();
      if (now - (lastSent.current[kind] ?? 0) < PRESENCE_MS) return;
      lastSent.current[kind] = now;
      send(op);
    },
    [send],
  );

  const broadcastCursor = useCallback(
    (x: number, y: number) => throttled('cursor', { [CANVAS_TAG]: 'cursor', x, y }),
    [throttled],
  );
  const broadcastSelection = useCallback(
    (ids: string[]) => send({ [CANVAS_TAG]: 'selection', ids }),
    [send],
  );
  const broadcastViewport = useCallback(
    (v: { x: number; y: number; zoom: number }) =>
      throttled('viewport', { [CANVAS_TAG]: 'viewport', ...v }),
    [throttled],
  );
  const broadcastDrag = useCallback(
    (id: string, x: number, y: number) => throttled('drag', { [CANVAS_TAG]: 'drag', id, x, y }),
    [throttled],
  );

  // ---- session controls ----
  const startSession = useCallback(
    async (name?: string): Promise<string | null> => {
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
    },
    [connect, selfName],
  );

  const startInterviewSession = useCallback(
    async (problemId: string, name?: string): Promise<string | null> => {
      setBannerDismissed(false);
      let code: string | null = null;
      try {
        code = await fetchNewRoomCode();
      } catch {
        code = makeRoomCode();
      }
      if (!code) return null;
      const { sessionMeta, backendDegraded } = await bootstrapHostInterviewSession(problemId, code);
      setBackendDegraded(backendDegraded);
      setSessionMeta(sessionMeta);
      connect(code, name?.trim() || selfName, { capacity: 8 });
      return code;
    },
    [connect, selfName],
  );

  const resumeInterviewSession = useCallback(
    (row: InterviewSummary, name?: string) => {
      if (!row.roomCode) return;
      setSessionMeta(buildResumeInterviewSession(row));
      persistInterviewHostRoom(row.roomCode);
      connect(row.roomCode, name?.trim() || selfName, { capacity: 8 });
    },
    [connect, selfName],
  );

  const joinSession = useCallback(
    (code: string, name?: string) => {
      const norm = normalizeRoomCode(code);
      if (norm.length < 4) return;
      const share = readShareFromUrl();
      if (share?.sessionKind === 'interview') {
        setSessionMeta(buildJoinInterviewSession(share.item ?? '', share.guestToken));
      } else {
        setSessionMeta(collabSession());
      }
      connect(norm, name?.trim() || selfName, { capacity: 8 });
    },
    [connect, selfName],
  );

  // Auto-join when the URL carries a room code (invite links). Interview links
  // are handled by the guest name-gate instead, so skip them here.
  const autoJoinRef = useRef(false);
  useEffect(() => {
    if (autoJoinRef.current || isCollaborating) return;
    if (readShareFromUrl()?.sessionKind === 'interview') return;
    const code = readRoomFromUrl();
    if (!code || code.length < 4) return;
    autoJoinRef.current = true;
    joinSession(code);
  }, [isCollaborating, joinSession]);

  const emitSubDoc = useCallback(
    (op: SubDocOp) => {
      if (!isCollaborating) return;
      if (isSubDocEditOp(op) && (role === 'host' || role === 'spectator')) return;
      send(op);
    },
    [send, isCollaborating, role],
  );

  const leaveSession = useCallback(() => {
    disconnect();
    setPeerMap({});
    setComments([]);
    setFollowId(null);
    setHostQuizLog([]);
    setSubDocs({});
    setSubDocCursors({});
    setSessionMeta(defaultSession('solo'));
    clearInterviewHost();
    setBackendDegraded(false);
    setBannerDismissed(false);
    autoJoinRef.current = false;

    // Strip room/sessionKind from URL so refresh doesn't re-join
    const current = readShareFromUrl();
    if (current?.room) {
      const { room: _, sessionKind: __, ...rest } = current;
      writeShareToUrl(rest);
    }
  }, [disconnect]);

  const updateInterviewSettings = useCallback(
    (patch: Partial<InterviewSettings>) => {
      if (!isHost) return;
      setSessionMeta((prev) => {
        if (prev.kind !== 'interview') return prev;
        return { ...prev, interview: { ...prev.interview!, ...patch } };
      });
    },
    [isHost],
  );

  // Host-only runtime patch — reduces over interviewRuntime and re-publishes.
  const patchRuntime = useCallback(
    (reduce: (r: InterviewRuntime) => InterviewRuntime) => {
      if (!isHost) return;
      setSessionMeta((prev) => {
        if (prev.kind !== 'interview') return prev;
        return {
          ...prev,
          interviewRuntime: reduce(prev.interviewRuntime ?? defaultInterviewRuntime()),
        };
      });
    },
    [isHost],
  );

  const startTimer = useCallback(
    (durationMs: number) => {
      const ms = Math.max(0, Math.round(durationMs));
      patchRuntime((r) => ({
        ...r,
        timer: { durationMs: ms, running: true, endsAt: Date.now() + ms, remainingMs: ms },
      }));
    },
    [patchRuntime],
  );

  const pauseTimer = useCallback(() => {
    patchRuntime((r) => {
      const remaining =
        r.timer.endsAt != null ? Math.max(0, r.timer.endsAt - Date.now()) : r.timer.remainingMs;
      return { ...r, timer: { ...r.timer, running: false, endsAt: null, remainingMs: remaining } };
    });
  }, [patchRuntime]);

  // Resume a paused timer WITHOUT shrinking its full duration (Reset still
  // restores the original length).
  const resumeTimer = useCallback(() => {
    patchRuntime((r) => {
      const ms = r.timer.remainingMs > 0 ? r.timer.remainingMs : r.timer.durationMs;
      if (ms <= 0) return r;
      return { ...r, timer: { ...r.timer, running: true, endsAt: Date.now() + ms } };
    });
  }, [patchRuntime]);

  const resetTimer = useCallback(() => {
    patchRuntime((r) => ({ ...r, timer: emptyTimerState() }));
  }, [patchRuntime]);

  const setLocked = useCallback(
    (locked: boolean) => patchRuntime((r) => ({ ...r, locked })),
    [patchRuntime],
  );

  const setHostFollow = useCallback(
    (on: boolean) => patchRuntime((r) => ({ ...r, hostFollow: on })),
    [patchRuntime],
  );

  const setHostFrameFollow = useCallback(
    (on: boolean) =>
      patchRuntime((r) => ({
        ...r,
        hostFrameFollow: on,
        playback: on ? r.playback : undefined,
      })),
    [patchRuntime],
  );

  const patchInterviewRuntime = patchRuntime;

  const dismissBackendBanner = useCallback(() => setBannerDismissed(true), []);

  const setSessionIdentity = useCallback((p: { sessionId?: string; guestToken?: string }) => {
    setSessionMeta((prev) => {
      if (prev.kind !== 'interview') return prev;
      return {
        ...prev,
        sessionId: p.sessionId ?? prev.sessionId,
        guestToken: p.guestToken ?? prev.guestToken,
      };
    });
  }, []);

  // ---- comment actions (optimistic locally; folded by the host doc) ----
  const emitEdit = useCallback(
    (op: EditOp) => {
      if (useYjsForCanvasGraph()) return;
      emit(op);
    },
    [emit],
  );

  const addComment = useCallback(
    (x: number, y: number, text: string) => {
      const body = text.trim();
      if (!body || !self) return;
      const comment: CanvasComment = {
        id: cid(),
        authorId: self.id,
        authorName: self.name,
        text: body,
        x,
        y,
        at: Date.now(),
        resolved: false,
        replies: [],
      };
      setComments((cs) => [...cs, comment]);
      emitEdit({ [CANVAS_TAG]: 'comment-add', comment });
    },
    [self, emitEdit],
  );

  const replyComment = useCallback(
    (id: string, text: string) => {
      const body = text.trim();
      if (!body || !self) return;
      const reply: CanvasCommentReply = {
        id: cid(),
        authorId: self.id,
        authorName: self.name,
        text: body,
        at: Date.now(),
      };
      setComments((cs) =>
        cs.map((c) => (c.id === id ? { ...c, replies: [...c.replies, reply] } : c)),
      );
      emitEdit({ [CANVAS_TAG]: 'comment-reply', id, reply });
    },
    [self, emitEdit],
  );

  const resolveComment = useCallback(
    (id: string, resolved: boolean) => {
      setComments((cs) => cs.map((c) => (c.id === id ? { ...c, resolved } : c)));
      emitEdit({ [CANVAS_TAG]: 'comment-resolve', id, resolved });
    },
    [emitEdit],
  );

  const removeComment = useCallback(
    (id: string) => {
      setComments((cs) => cs.filter((c) => c.id !== id));
      emitEdit({ [CANVAS_TAG]: 'comment-remove', id });
    },
    [emitEdit],
  );

  const peers = useMemo(() => Object.values(peerMap), [peerMap]);

  const value = useMemo<CanvasCollabApi>(
    () => ({
      status,
      room,
      role,
      self,
      players,
      isCollaborating,
      isHost,
      session: sessionMeta,
      startSession,
      startInterviewSession,
      joinSession,
      leaveSession,
      updateInterviewSettings,
      resumeInterviewSession,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      setLocked,
      setHostFollow,
      setHostFrameFollow,
      patchInterviewRuntime,
      setSessionIdentity,
      backendDegraded,
      dismissBackendBanner,
      peers,
      followId,
      setFollowId,
      broadcastCursor,
      broadcastSelection,
      broadcastViewport,
      broadcastDrag,
      comments,
      addComment,
      replyComment,
      resolveComment,
      removeComment,
      hostQuizLog,
      subDocs,
      setSubDocs,
      subDocCursors,
      emitSubDoc,
      emit,
      setComments,
    }),
    [
      status,
      room,
      role,
      self,
      players,
      isCollaborating,
      isHost,
      sessionMeta,
      startSession,
      startInterviewSession,
      joinSession,
      leaveSession,
      updateInterviewSettings,
      resumeInterviewSession,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      setLocked,
      setHostFollow,
      setHostFrameFollow,
      patchInterviewRuntime,
      setSessionIdentity,
      backendDegraded,
      dismissBackendBanner,
      peers,
      followId,
      broadcastCursor,
      broadcastSelection,
      broadcastViewport,
      broadcastDrag,
      comments,
      addComment,
      replyComment,
      resolveComment,
      removeComment,
      hostQuizLog,
      subDocs,
      emitSubDoc,
      emit,
    ],
  );

  return (
    <YjsCollabBridge isCollaborating={isCollaborating} isHost={isHost}>
      <CanvasCollabContext.Provider value={value}>
        {children}
        {backendDegraded && !bannerDismissed && sessionMeta.kind === 'interview' ? (
          <SoloFallbackBanner
            message="Interview is running without cloud persistence — durable guest invite links and session history are unavailable. LAN relay still works."
            onDismiss={dismissBackendBanner}
          />
        ) : null}
      </CanvasCollabContext.Provider>
    </YjsCollabBridge>
  );
}

function YjsCollabBridge({
  children,
  isCollaborating,
  isHost,
}: {
  children: ReactNode;
  isCollaborating: boolean;
  isHost: boolean;
}) {
  const { room } = useGameRoom();
  const yjs = useYjsCanvasCollab({ roomId: room, isCollaborating, isHost });
  return <YjsCollabProvider value={yjs}>{children}</YjsCollabProvider>;
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
    <GameRoomProvider>
      <RoomCommsProvider>
        <CollabState>{children}</CollabState>
      </RoomCommsProvider>
    </GameRoomProvider>
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
