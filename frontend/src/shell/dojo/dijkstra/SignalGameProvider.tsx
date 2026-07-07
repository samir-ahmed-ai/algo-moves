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
import {
  dojoCompletedCount,
  firstIncompleteDojoLevelId,
  getDojoProgressStore,
  isDojoLevelUnlocked,
  type DojoProgress,
} from '@/store/dojo/dojoProgress';
import { starsForMoves } from '@/shell/dojo/ui/shared';
import { playDojoError, playDojoSuccess, playDojoTone } from '@/shell/dojo/lib/audio';
import { parseDojoHash, writeDojoHash } from '@/lib/navigation';
import {
  LEVELS,
  LEVEL_IDS,
  createState,
  getLevel,
  getNode,
  isComplete,
  nextLevelId,
  settleNode,
  shortestPath,
  shortestPathEdges,
  type Relaxation,
  type SignalLevel,
  type SignalState,
} from './engine/signal';

export const SIGNAL_GAME_ID = 'dijkstra';

const store = getDojoProgressStore(SIGNAL_GAME_ID);

function levelFromHash(): string {
  const fallback = () => firstIncompleteDojoLevelId(LEVEL_IDS, store.read()) ?? LEVEL_IDS[0]!;
  if (typeof location === 'undefined') return fallback();
  const parsed = parseDojoHash(location.hash, location.pathname);
  const id = parsed?.levelId;
  if (id && getLevel(id) && isDojoLevelUnlocked(LEVEL_IDS, LEVEL_IDS.indexOf(id), store.read())) {
    return id;
  }
  return fallback();
}

export interface SignalFlash {
  relaxations: Relaxation[];
  tick: number;
}

export interface SignalGameContextValue {
  levelId: string;
  level: SignalLevel;
  progress: DojoProgress;
  state: SignalState;
  actions: number;
  message: string | undefined;
  error: boolean;
  shakeKey: number | null;
  flash: SignalFlash | null;
  complete: boolean;
  path: number[];
  pathEdges: Set<string>;
  showIntro: boolean;
  nextId: string | null;
  completedCount: number;
  selectLevel: (id: string) => void;
  resetLevel: () => void;
  dismissIntro: () => void;
  handleKey: (key: string) => boolean;
}

const SignalGameContext = createContext<SignalGameContextValue | null>(null);

export function SignalGameProvider({ children }: { children: ReactNode }) {
  const [levelId, setLevelId] = useState(levelFromHash);
  const progress = store.use();
  const level = useMemo(() => getLevel(levelId) ?? LEVELS[0]!, [levelId]);

  const [state, setState] = useState<SignalState>(() => createState(level));
  const [actions, setActions] = useState(0);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState(false);
  const [shakeKey, setShakeKey] = useState<number | null>(null);
  const [flash, setFlash] = useState<SignalFlash | null>(null);
  const [complete, setComplete] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTick = useRef(0);

  const triggerShake = useCallback((key: number) => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    setShakeKey(key);
    shakeTimer.current = setTimeout(() => setShakeKey(null), 300);
  }, []);

  const triggerFlash = useCallback((relaxations: Relaxation[]) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTick.current += 1;
    setFlash({ relaxations, tick: flashTick.current });
    flashTimer.current = setTimeout(() => setFlash(null), 700);
  }, []);

  useEffect(
    () => () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const resetLevel = useCallback(() => {
    setState(createState(level));
    setActions(0);
    setMessage(undefined);
    setError(false);
    setShakeKey(null);
    setFlash(null);
    setComplete(false);
  }, [level]);

  const selectLevel = useCallback((id: string) => {
    if (!getLevel(id)) return;
    setLevelId(id);
    writeDojoHash({ gameId: SIGNAL_GAME_ID, levelId: id });
  }, []);

  const dismissIntro = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    resetLevel();
    setShowIntro(true);
  }, [levelId, resetLevel]);

  // Normalize corrupt or missing deep links to the resolved level.
  useEffect(() => {
    if (typeof location === 'undefined') return;
    const parsed = parseDojoHash(location.hash, location.pathname);
    if (parsed && parsed.levelId !== levelId) {
      writeDojoHash({ gameId: SIGNAL_GAME_ID, levelId }, { replace: true });
    }
  }, []);

  /** A wrong action is a mistake: it still costs an action, per the dojo rules. */
  const failAction = useCallback(
    (key: number, msg: string) => {
      playDojoError();
      triggerShake(key);
      setError(true);
      setMessage(msg);
      setActions((a) => a + 1);
    },
    [triggerShake],
  );

  const name = useCallback((key: number) => getNode(level, key)?.name ?? `node ${key}`, [level]);

  const pressNode = useCallback(
    (key: number) => {
      const result = settleNode(level, state, key);
      if (!result.ok) {
        if (result.reason === 'settled') {
          setError(false);
          setMessage(
            `${name(key)} is already settled at distance ${state.dist[key]} — that value is final; pick an unsettled node.`,
          );
        } else if (result.reason === 'unreached') {
          failAction(
            key,
            `dist(${key})=∞ — the signal hasn't reached ${name(key)} yet. The closest unsettled node is ${name(result.minKey)} with dist(${result.minKey})=${result.minDist}.`,
          );
        } else {
          failAction(
            key,
            `dist(${key})=${result.dist} but dist(${result.minKey})=${result.minDist} — settle the closest; no later route can undercut it.`,
          );
        }
        return;
      }

      const spent = actions + 1;
      const nextState = result.state;
      setState(nextState);
      setActions(spent);
      setError(false);
      triggerFlash(result.relaxations);

      if (isComplete(level, nextState)) {
        const path = shortestPath(level, nextState);
        const route = path.map((k) => getNode(level, k)?.name ?? k).join(' → ');
        setComplete(true);
        setMessage(`${route} — total ${nextState.dist[level.target]}. Shortest route locked in.`);
        playDojoSuccess();
        store.markLevelComplete(level.id, spent, starsForMoves(spent, level.par));
        return;
      }

      playDojoTone(nextState.settled.length - 1);
      const improved = result.relaxations.filter((r) => r.improved);
      const updates = improved
        .map((r) => `dist(${r.to}) ${r.oldDist === Infinity ? '∞' : r.oldDist}→${r.newDist}`)
        .join(', ');
      setMessage(
        `Settled ${name(key)} at distance ${nextState.dist[key]} — final forever.${
          improved.length > 0 ? ` Relaxed: ${updates}.` : ' No neighbor improved.'
        }`,
      );
    },
    [actions, failAction, level, name, state, triggerFlash],
  );

  const handleKey = useCallback(
    (key: string): boolean => {
      if (complete) {
        if (key === 'Enter') {
          const next = nextLevelId(level.id);
          if (next) selectLevel(next);
          return true;
        }
        if (key === 'r' || key === 'Escape') {
          resetLevel();
          return true;
        }
        return false;
      }

      let handled = true;
      if (/^[1-9]$/.test(key)) {
        const digit = Number(key);
        if (getNode(level, digit)) pressNode(digit);
        else handled = false;
      } else if (key === 'r' || key === 'Escape') {
        resetLevel();
      } else if (key === '[' || key === ']') {
        const idx = LEVEL_IDS.indexOf(level.id) + (key === '[' ? -1 : 1);
        const target = LEVEL_IDS[idx];
        if (target && isDojoLevelUnlocked(LEVEL_IDS, idx, store.read())) selectLevel(target);
      } else {
        handled = false;
      }
      if (handled) setShowIntro(false);
      return handled;
    },
    [complete, level, pressNode, resetLevel, selectLevel],
  );

  const path = useMemo(
    () => (complete ? shortestPath(level, state) : []),
    [complete, level, state],
  );
  const pathEdges = useMemo(
    () => (complete ? shortestPathEdges(level, state) : new Set<string>()),
    [complete, level, state],
  );

  const nextId = nextLevelId(level.id);
  const completedCount = dojoCompletedCount(LEVEL_IDS, progress);

  const value = useMemo<SignalGameContextValue>(
    () => ({
      levelId,
      level,
      progress,
      state,
      actions,
      message,
      error,
      shakeKey,
      flash,
      complete,
      path,
      pathEdges,
      showIntro,
      nextId,
      completedCount,
      selectLevel,
      resetLevel,
      dismissIntro,
      handleKey,
    }),
    [
      levelId,
      level,
      progress,
      state,
      actions,
      message,
      error,
      shakeKey,
      flash,
      complete,
      path,
      pathEdges,
      showIntro,
      nextId,
      completedCount,
      selectLevel,
      resetLevel,
      dismissIntro,
      handleKey,
    ],
  );

  return <SignalGameContext.Provider value={value}>{children}</SignalGameContext.Provider>;
}

export function useSignalGame(): SignalGameContextValue {
  const ctx = useContext(SignalGameContext);
  if (!ctx) throw new Error('useSignalGame must be used within SignalGameProvider');
  return ctx;
}
