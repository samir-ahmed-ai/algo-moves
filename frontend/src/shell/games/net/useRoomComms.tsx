import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useGameRoom } from './useGameRoom';
import { useAuth } from '../data/AuthProvider';
import { playCue } from '@/lib/utils/audio';

/**
 * Room-level chat, emoji reactions, ready-state presence and player identity,
 * multiplexed over the same relay channel the games use. Room messages carry an
 * `__arcade` tag so game move handlers (which switch on their own `kind`) ignore
 * them and vice versa. Presence is peer-broadcast (not host state) so any player
 * can toggle their own ready and share their profile id; late joiners
 * request a re-announce.
 *
 * Exposed as a provider so a single instance (one chat log, one presence map) is
 * shared by the RoomView, the games and the match reporter.
 */

export interface ChatMessage {
  id: string;
  fromId: string;
  name: string;
  text: string;
  at: number;
}

export interface Reaction {
  id: string;
  fromId: string;
  emoji: string;
  at: number;
}

/** Maps a connection (peer) id to the durable identity behind it. */
export interface Identity {
  profileId: string | null;
  name: string;
}

type PresenceMsg = { __arcade: 'presence'; ready: boolean; profileId: string | null };
type ArcadeMsg =
  | { __arcade: 'chat'; text: string; name: string }
  | { __arcade: 'reaction'; emoji: string }
  | PresenceMsg
  | { __arcade: 'presence-request' }
  | { __arcade: 'result'; winners: string[] };

const MAX_MESSAGES = 60;
const REACTION_TTL = 2600;
const MASKED = /\b(fuck|shit|bitch|asshole|cunt)\b/gi;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;

function cleanChat(raw: string): string {
  const trimmed = raw.replace(CONTROL_CHARS, '').trim().slice(0, 240);
  return trimmed.replace(MASKED, (m) => m[0] + '*'.repeat(Math.max(1, m.length - 1)));
}

let seq = 0;
const uid = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

export interface RoomComms {
  messages: ChatMessage[];
  reactions: Reaction[];
  readyIds: Set<string>;
  ready: boolean;
  /** peerId → durable identity, for match attribution and profile links. */
  identities: Record<string, Identity>;
  /** peerId → matches won this session (across rematches). */
  standings: Record<string, number>;
  sendChat: (text: string) => void;
  sendReaction: (emoji: string) => void;
  setReady: (ready: boolean) => void;
  /** Record a finished match's winners into the running session standings (host only). */
  reportResult: (winnerPeerIds: string[]) => void;
}

function useRoomCommsState(): RoomComms {
  const { self, players, send, subscribe } = useGameRoom();
  const { userId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [readyMap, setReadyMap] = useState<Record<string, boolean>>({});
  const [identities, setIdentities] = useState<Record<string, Identity>>({});
  const [standings, setStandings] = useState<Record<string, number>>({});

  const selfReady = useRef(false);
  const selfProfile = useRef<string | null>(userId);
  selfProfile.current = userId;

  // Track pending reaction-expiry timers so they can be cleared on unmount
  // (otherwise a late timer calls setState on an unmounted provider).
  const reactionTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  useEffect(() => {
    const timers = reactionTimers.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);
  const expireReaction = useCallback((id: string) => {
    const t = setTimeout(() => {
      setReactions((cur) => cur.filter((r) => r.id !== id));
      reactionTimers.current.delete(t);
    }, REACTION_TTL);
    reactionTimers.current.add(t);
  }, []);

  const applyWinners = useCallback((winners: string[]) => {
    setStandings((cur) => {
      const next = { ...cur };
      for (const w of winners) next[w] = (next[w] ?? 0) + 1;
      return next;
    });
  }, []);

  const nameFor = useCallback(
    (id: string) => players.find((p) => p.id === id)?.name ?? (self?.id === id ? self.name : 'Player'),
    [players, self],
  );

  useEffect(() => {
    return subscribe((data, fromId) => {
      const msg = data as Partial<ArcadeMsg>;
      if (!msg || typeof msg !== 'object' || !('__arcade' in msg)) return;
      switch (msg.__arcade) {
        case 'chat':
          setMessages((cur) =>
            [
              ...cur,
              {
                id: uid(),
                fromId,
                name: (msg as { name: string }).name,
                text: (msg as { text: string }).text,
                at: Date.now(),
              },
            ].slice(-MAX_MESSAGES),
          );
          playCue('message');
          break;
        case 'reaction': {
          const emoji = (msg as { emoji: string }).emoji;
          const id = uid();
          setReactions((cur) => [...cur, { id, fromId, emoji, at: Date.now() }]);
          playCue('reaction');
          expireReaction(id);
          break;
        }
        case 'result':
          applyWinners((msg as { winners: string[] }).winners ?? []);
          break;
        case 'presence':
          setReadyMap((cur) => ({ ...cur, [fromId]: (msg as PresenceMsg).ready }));
          setIdentities((cur) => ({
            ...cur,
            [fromId]: { profileId: (msg as PresenceMsg).profileId, name: nameFor(fromId) },
          }));
          break;
        case 'presence-request':
          send({
            __arcade: 'presence',
            ready: selfReady.current,
            profileId: selfProfile.current,
          } satisfies ArcadeMsg);
          break;
      }
    });
  }, [subscribe, send, nameFor, expireReaction, applyWinners]);

  // Announce ourselves (and ask others to) whenever the roster or identity changes.
  const rosterKey = players.map((p) => p.id).join(',');
  useEffect(() => {
    if (!self) return;
    setIdentities((cur) => ({ ...cur, [self.id]: { profileId: userId, name: self.name } }));
    send({ __arcade: 'presence-request' } satisfies ArcadeMsg);
    send({ __arcade: 'presence', ready: selfReady.current, profileId: userId } satisfies ArcadeMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey, self?.id, userId, send]);

  const sendChat = useCallback(
    (raw: string) => {
      const text = cleanChat(raw);
      if (!text || !self) return;
      setMessages((cur) =>
        [...cur, { id: uid(), fromId: self.id, name: self.name, text, at: Date.now() }].slice(-MAX_MESSAGES),
      );
      send({ __arcade: 'chat', text, name: self.name } satisfies ArcadeMsg);
    },
    [self, send],
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!self) return;
      const id = uid();
      setReactions((cur) => [...cur, { id, fromId: self.id, emoji, at: Date.now() }]);
      expireReaction(id);
      send({ __arcade: 'reaction', emoji } satisfies ArcadeMsg);
    },
    [self, send, expireReaction],
  );

  // Host records a finished match's winners and broadcasts them so every client
  // (relay doesn't echo to the sender) keeps the same session standings.
  const reportResult = useCallback(
    (winnerPeerIds: string[]) => {
      if (!winnerPeerIds.length) return;
      applyWinners(winnerPeerIds);
      send({ __arcade: 'result', winners: winnerPeerIds } satisfies ArcadeMsg);
    },
    [send, applyWinners],
  );

  const setReady = useCallback(
    (ready: boolean) => {
      if (!self) return;
      selfReady.current = ready;
      setReadyMap((cur) => ({ ...cur, [self.id]: ready }));
      send({ __arcade: 'presence', ready, profileId: selfProfile.current } satisfies ArcadeMsg);
    },
    [self, send],
  );

  const readyIds = new Set(
    Object.entries(readyMap)
      .filter(([, v]) => v)
      .map(([k]) => k),
  );

  return {
    messages,
    reactions,
    readyIds,
    ready: self ? readyIds.has(self.id) : false,
    identities,
    standings,
    sendChat,
    sendReaction,
    setReady,
    reportResult,
  };
}

const RoomCommsContext = createContext<RoomComms | null>(null);

export function RoomCommsProvider({ children }: { children: ReactNode }) {
  const value = useRoomCommsState();
  return <RoomCommsContext.Provider value={value}>{children}</RoomCommsContext.Provider>;
}

export function useRoomComms(): RoomComms {
  const ctx = useContext(RoomCommsContext);
  if (!ctx) throw new Error('useRoomComms must be used within a RoomCommsProvider');
  return ctx;
}
