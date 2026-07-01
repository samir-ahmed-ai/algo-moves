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
import { gameServerWsUrl } from './gameServer';
import { parseServerMessage, type Peer, type Role } from './protocol';

export type RoomStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error' | 'full';

type RelayHandler = (data: unknown, fromId: string) => void;
type StateHandler = (state: unknown) => void;

export interface GameRoomApi {
  status: RoomStatus;
  room: string | null;
  self: Peer | null;
  /** The other player, or null while you are alone in the room. */
  peer: Peer | null;
  role: Role | null;
  /** Both players are present and the socket is open. */
  connected: boolean;
  /** Socket open but still waiting for the other player. */
  waiting: boolean;
  error: string | null;
  /** Host-authoritative shared state (which game is selected, etc.). */
  sharedState: unknown;

  connect: (room: string, name: string) => void;
  disconnect: () => void;
  /** Send a game move to the peer (relayed). */
  send: (data: unknown) => void;
  /** Publish shared room state (survives late joins); updates locally too. */
  publishState: (state: unknown) => void;
  /** Subscribe to peer relay messages. Returns an unsubscribe fn. */
  subscribe: (fn: RelayHandler) => () => void;
  /** Subscribe to shared-state changes. Returns an unsubscribe fn. */
  subscribeState: (fn: StateHandler) => () => void;
}

const MAX_RETRIES = 5;

const GameRoomContext = createContext<GameRoomApi | null>(null);

export function GameRoomProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [room, setRoom] = useState<string | null>(null);
  const [self, setSelf] = useState<Peer | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [sharedState, setSharedState] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const relayListeners = useRef(new Set<RelayHandler>());
  const stateListeners = useRef(new Set<StateHandler>());
  const targetRef = useRef<{ room: string; name: string } | null>(null);
  const shouldReconnect = useRef(false);
  const retriesRef = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSocket = useCallback((roomCode: string, name: string) => {
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
      ws = new WebSocket(gameServerWsUrl(roomCode, name));
    } catch {
      setStatus('error');
      setError('Could not reach the game server.');
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      setStatus('open');
    };

    ws.onmessage = (event) => {
      const msg = parseServerMessage(typeof event.data === 'string' ? event.data : '');
      if (!msg) return;
      switch (msg.t) {
        case 'welcome':
          setSelf(msg.self);
          setPeers(msg.peers);
          setSharedState(msg.state ?? null);
          stateListeners.current.forEach((fn) => fn(msg.state ?? null));
          break;
        case 'peer-join':
          setPeers((prev) =>
            prev.some((p) => p.id === msg.peer.id) ? prev : [...prev, msg.peer],
          );
          break;
        case 'peer-leave':
          setPeers((prev) => prev.filter((p) => p.id !== msg.peer.id));
          break;
        case 'relay':
          relayListeners.current.forEach((fn) => fn(msg.d, msg.from));
          break;
        case 'state':
          setSharedState(msg.d ?? null);
          stateListeners.current.forEach((fn) => fn(msg.d ?? null));
          break;
        case 'error':
          if (msg.msg === 'room-full') {
            shouldReconnect.current = false;
            setStatus('full');
            setError('That room already has two players.');
          } else {
            setError(msg.msg);
          }
          break;
      }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return; // superseded by a newer socket
      wsRef.current = null;
      setSelf(null);
      setPeers([]);
      if (shouldReconnect.current && retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1;
        setStatus('connecting');
        const delay = Math.min(800 * retriesRef.current, 4000);
        retryTimer.current = setTimeout(() => {
          const t = targetRef.current;
          if (t && shouldReconnect.current) openSocket(t.room, t.name);
        }, delay);
      } else if (shouldReconnect.current) {
        setStatus('error');
        setError('Lost connection to the game server.');
      } else {
        setStatus('closed');
      }
    };

    ws.onerror = () => {
      // onclose runs right after and drives status; just surface a hint.
      setError((e) => e ?? 'Game server connection problem.');
    };
  }, []);

  const connect = useCallback(
    (roomCode: string, name: string) => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      const code = roomCode.toUpperCase();
      targetRef.current = { room: code, name };
      shouldReconnect.current = true;
      retriesRef.current = 0;
      setRoom(code);
      openSocket(code, name);
    },
    [openSocket],
  );

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    targetRef.current = null;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('idle');
    setRoom(null);
    setSelf(null);
    setPeers([]);
    setSharedState(null);
    setError(null);
  }, []);

  const send = useCallback((data: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ t: 'relay', d: data }));
    }
  }, []);

  const publishState = useCallback((state: unknown) => {
    setSharedState(state);
    stateListeners.current.forEach((fn) => fn(state));
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ t: 'state', d: state }));
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

  const peer = peers[0] ?? null;
  const value = useMemo<GameRoomApi>(
    () => ({
      status,
      room,
      self,
      peer,
      role: self?.role ?? null,
      connected: status === 'open' && peer !== null,
      waiting: status === 'open' && peer === null,
      error,
      sharedState,
      connect,
      disconnect,
      send,
      publishState,
      subscribe,
      subscribeState,
    }),
    [status, room, self, peer, error, sharedState, connect, disconnect, send, publishState, subscribe, subscribeState],
  );

  return <GameRoomContext.Provider value={value}>{children}</GameRoomContext.Provider>;
}

export function useGameRoom(): GameRoomApi {
  const ctx = useContext(GameRoomContext);
  if (!ctx) throw new Error('useGameRoom must be used within a GameRoomProvider');
  return ctx;
}
