import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { gameServerWsUrl, makePlayerId } from './server';
import { isPlayerRole, parseServerMessage, type Peer, type Role } from './protocol';

export type RoomStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error' | 'full';

type RelayHandler = (data: unknown, fromId: string) => void;
type StateHandler = (state: unknown) => void;

/** How to join a room: watch instead of play, and how large a new room should be. */
export interface ConnectOptions {
  asSpectator?: boolean;
  capacity?: number;
}

export interface GameRoomApi {
  status: RoomStatus;
  room: string | null;
  self: Peer | null;
  /** Everyone holding an active player seat, in seat order (includes you if you play). */
  players: Peer[];
  /** Everyone watching without a seat (includes you if you spectate). */
  spectators: Peer[];
  /** The first other player — back-compat convenience for two-player games. */
  peer: Peer | null;
  role: Role | null;
  /** You are watching rather than occupying a player seat. */
  isSpectator: boolean;
  capacity: number;
  playerCount: number;
  spectatorCount: number;
  /** At least one other player is present and the socket is open. */
  connected: boolean;
  /** Socket open but you are the only player so far. */
  waiting: boolean;
  /** Retrying after a transient drop while we still hold our prior identity — the game view stays up. */
  reconnecting: boolean;
  error: string | null;
  /** Host-authoritative shared state (which game is selected, room mode, etc.). */
  sharedState: unknown;

  connect: (room: string, name: string, opts?: ConnectOptions) => void;
  disconnect: () => void;
  /** Send a game move to the room (relayed to every other member). */
  send: (data: unknown) => void;
  /** Publish shared room state (survives late joins); updates locally too. Host only server-side. */
  publishState: (state: unknown) => void;
  /** Ask to switch between playing and spectating. */
  requestSeat: (want: 'player' | 'spectator') => void;
  /** Subscribe to peer relay messages. Returns an unsubscribe fn. */
  subscribe: (fn: RelayHandler) => () => void;
  /** Subscribe to shared-state changes. Returns an unsubscribe fn. */
  subscribeState: (fn: StateHandler) => () => void;
}

const MAX_RETRIES = 5;

/**
 * One stable pid per room per tab, persisted so a page reload reclaims the
 * exact seat/role from the relay (a reloading host stays host — the server
 * evicts the stale connection for the same pid). sessionStorage keeps two
 * tabs from stealing each other's seat.
 */
function reclaimablePid(room: string): string {
  const key = `algomoves:room-pid:${room}`;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const pid = makePlayerId();
    sessionStorage.setItem(key, pid);
    return pid;
  } catch {
    return makePlayerId();
  }
}

const GameRoomContext = createContext<GameRoomApi | null>(null);

/** Add or replace a peer in the roster, moving it to the list its role implies. */
function bucketPeer(players: Peer[], spectators: Peer[], peer: Peer): [Peer[], Peer[]] {
  const nextPlayers = players.filter((p) => p.id !== peer.id);
  const nextSpectators = spectators.filter((p) => p.id !== peer.id);
  if (isPlayerRole(peer.role)) nextPlayers.push(peer);
  else nextSpectators.push(peer);
  return [nextPlayers, nextSpectators];
}

export function GameRoomProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [room, setRoom] = useState<string | null>(null);
  const [self, setSelf] = useState<Peer | null>(null);
  const [players, setPlayers] = useState<Peer[]>([]);
  const [spectators, setSpectators] = useState<Peer[]>([]);
  const [capacity, setCapacity] = useState<number>(2);
  const [sharedState, setSharedState] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const relayListeners = useRef(new Set<RelayHandler>());
  const stateListeners = useRef(new Set<StateHandler>());
  const targetRef = useRef<{
    room: string;
    name: string;
    pid: string;
    asSpectator: boolean;
    capacity?: number;
  } | null>(null);
  const shouldReconnect = useRef(false);
  const retriesRef = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRelay = useRef<unknown[]>([]);
  const pendingState = useRef<unknown | null>(null);

  const flushOutbound = useCallback((ws: WebSocket) => {
    for (const d of pendingRelay.current) {
      ws.send(JSON.stringify({ t: 'relay', d: d }));
    }
    pendingRelay.current = [];
    if (pendingState.current !== null) {
      ws.send(JSON.stringify({ t: 'state', d: pendingState.current }));
      pendingState.current = null;
    }
  }, []);

  const clearRoster = useCallback(() => {
    setSelf(null);
    setPlayers([]);
    setSpectators([]);
  }, []);

  // Refs mirror the roster so the socket's message handler can re-bucket peers
  // without re-subscribing every render.
  const playersRef = useRef<Peer[]>([]);
  const spectatorsRef = useRef<Peer[]>([]);
  playersRef.current = players;
  spectatorsRef.current = spectators;

  const handleServerError = useCallback((reason: string) => {
    switch (reason) {
      case 'room-full':
        shouldReconnect.current = false;
        setStatus('full');
        setError('That room is full — even the spectator seats are taken.');
        break;
      case 'server-full':
        shouldReconnect.current = false;
        setStatus('error');
        setError('The game server is at capacity. Try again in a moment.');
        break;
      case 'replaced-by-reconnect':
        shouldReconnect.current = false;
        setStatus('closed');
        setError('You joined this room from another device or tab.');
        break;
      case 'seats-full':
        // A soft failure (a seat claim was rejected) — keep the session alive.
        setError('All player seats are taken right now.');
        break;
      default:
        setError(reason);
    }
  }, []);

  const openSocket = useCallback(
    (target: {
      room: string;
      name: string;
      pid: string;
      asSpectator: boolean;
      capacity?: number;
    }) => {
      // Tear down any previous socket without triggering its reconnect path.
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus('connecting');
      setError(null);

      let ws: WebSocket;
      try {
        ws = new WebSocket(
          gameServerWsUrl(target.room, target.name, {
            pid: target.pid,
            asSpectator: target.asSpectator,
            capacity: target.capacity,
          }),
        );
      } catch {
        setStatus('error');
        setError('Could not reach the game server.');
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        retriesRef.current = 0;
        setStatus('open');
        flushOutbound(ws);
      };

      ws.onmessage = (event) => {
        const msg = parseServerMessage(typeof event.data === 'string' ? event.data : '');
        if (!msg) return;
        switch (msg.t) {
          case 'welcome':
            setSelf(msg.self);
            setPlayers(msg.players ?? []);
            setSpectators(msg.spectators ?? []);
            setCapacity(msg.capacity ?? 2);
            setSharedState(msg.state ?? null);
            stateListeners.current.forEach((fn) => fn(msg.state ?? null));
            break;
          case 'peer-join':
            setPlayers((p) => bucketPeer(p, spectatorsRef.current, msg.peer)[0]);
            setSpectators((s) => bucketPeer(playersRef.current, s, msg.peer)[1]);
            break;
          case 'peer-leave':
            setPlayers((p) => p.filter((x) => x.id !== msg.peer.id));
            setSpectators((s) => s.filter((x) => x.id !== msg.peer.id));
            break;
          case 'role-change':
            setPlayers((p) => bucketPeer(p, spectatorsRef.current, msg.peer)[0]);
            setSpectators((s) => bucketPeer(playersRef.current, s, msg.peer)[1]);
            setSelf((cur) =>
              cur && cur.id === msg.peer.id ? { ...cur, role: msg.peer.role } : cur,
            );
            break;
          case 'relay':
            relayListeners.current.forEach((fn) => fn(msg.d, msg.from));
            break;
          case 'state':
            setSharedState(msg.d ?? null);
            stateListeners.current.forEach((fn) => fn(msg.d ?? null));
            break;
          case 'error':
            handleServerError(msg.msg);
            break;
        }
      };

      ws.onclose = () => {
        if (wsRef.current !== ws) return; // superseded by a newer socket
        wsRef.current = null;
        if (shouldReconnect.current && retriesRef.current < MAX_RETRIES) {
          // Keep self/roster so the in-progress game stays mounted across a
          // transient blip; a fresh 'welcome' refreshes them on reconnect.
          retriesRef.current += 1;
          setStatus('connecting');
          const delay = Math.min(800 * retriesRef.current, 4000);
          retryTimer.current = setTimeout(() => {
            const t = targetRef.current;
            if (t && shouldReconnect.current) openSocket(t);
          }, delay);
        } else if (shouldReconnect.current) {
          clearRoster();
          setStatus('error');
          setError('Lost connection to the game server.');
        } else {
          clearRoster();
          setStatus('closed');
        }
      };

      ws.onerror = () => {
        // onclose runs right after and drives status; just surface a hint.
        setError((e) => e ?? 'Game server connection problem.');
      };
    },
    [flushOutbound, clearRoster, handleServerError],
  );

  const connect = useCallback(
    (roomCode: string, name: string, opts: ConnectOptions = {}) => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      const code = roomCode.toUpperCase();
      // Stable per-room pid (see reclaimablePid): reconnects AND reloads
      // reclaim the same seat/role from the server.
      const pid = reclaimablePid(code);
      const target = {
        room: code,
        name,
        pid,
        asSpectator: opts.asSpectator ?? false,
        capacity: opts.capacity,
      };
      targetRef.current = target;
      shouldReconnect.current = true;
      retriesRef.current = 0;
      pendingRelay.current = [];
      pendingState.current = null;
      setRoom(code);
      openSocket(target);
    },
    [openSocket],
  );

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    targetRef.current = null;
    pendingRelay.current = [];
    pendingState.current = null;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('idle');
    setRoom(null);
    clearRoster();
    setCapacity(2);
    setSharedState(null);
    setError(null);
  }, [clearRoster]);

  const send = useCallback((data: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ t: 'relay', d: data }));
    } else if (shouldReconnect.current && targetRef.current) {
      pendingRelay.current.push(data);
    }
  }, []);

  const publishState = useCallback((state: unknown) => {
    setSharedState(state);
    stateListeners.current.forEach((fn) => fn(state));
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ t: 'state', d: state }));
    } else if (shouldReconnect.current && targetRef.current) {
      pendingState.current = state;
    }
  }, []);

  const requestSeat = useCallback((want: 'player' | 'spectator') => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ t: 'seat', d: { want } }));
    }
  }, []);

  const subscribe = useCallback((fn: RelayHandler) => {
    relayListeners.current.add(fn);
    return () => {
      relayListeners.current.delete(fn);
    };
  }, []);

  const subscribeState = useCallback((fn: StateHandler) => {
    stateListeners.current.add(fn);
    return () => {
      stateListeners.current.delete(fn);
    };
  }, []);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      shouldReconnect.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const role = self?.role ?? null;
  const otherPlayers = useMemo(() => players.filter((p) => p.id !== self?.id), [players, self]);
  const peer = otherPlayers[0] ?? null;

  const value = useMemo<GameRoomApi>(
    () => ({
      status,
      room,
      self,
      players,
      spectators,
      peer,
      role,
      isSpectator: role === 'spectator',
      capacity,
      playerCount: players.length,
      spectatorCount: spectators.length,
      connected: status === 'open' && peer !== null,
      waiting: status === 'open' && peer === null,
      reconnecting: status === 'connecting' && self !== null,
      error,
      sharedState,
      connect,
      disconnect,
      send,
      publishState,
      requestSeat,
      subscribe,
      subscribeState,
    }),
    [
      status,
      room,
      self,
      players,
      spectators,
      peer,
      role,
      capacity,
      error,
      sharedState,
      connect,
      disconnect,
      send,
      publishState,
      requestSeat,
      subscribe,
      subscribeState,
    ],
  );

  return <GameRoomContext.Provider value={value}>{children}</GameRoomContext.Provider>;
}

export function useGameRoomOptional(): GameRoomApi | null {
  return useContext(GameRoomContext);
}

export function useGameRoom(): GameRoomApi {
  const ctx = useContext(GameRoomContext);
  if (!ctx) throw new Error('useGameRoom must be used within a GameRoomProvider');
  return ctx;
}

/** Alias for {@link useGameRoom} — preferred in new canvas/collab code. */
export const useRoom = useGameRoom;

export type RoomApi = GameRoomApi;
