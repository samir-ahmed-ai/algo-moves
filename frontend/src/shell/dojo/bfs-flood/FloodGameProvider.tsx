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
import {
  playDojoError,
  playDojoMelody,
  playDojoSuccess,
  playDojoTone,
} from '@/shell/dojo/lib/audio';
import { parseDojoHash, writeDojoHash } from '@/lib/navigation';
import {
  LEVELS,
  LEVEL_IDS,
  createState,
  expandAt,
  getLevel,
  isComplete,
  maxDistance,
  nextLevelId,
  parseGrid,
  referenceDistances,
  type FloodLevel,
  type FloodState,
  type ParsedGrid,
} from './engine/flood';

export const FLOOD_GAME_ID = 'bfs-flood';

const store = getDojoProgressStore(FLOOD_GAME_ID);

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

export interface FloodGameContextValue {
  levelId: string;
  level: FloodLevel;
  parsed: ParsedGrid;
  /** Reference BFS distances for the whole grid (tint scaling, a11y). */
  reference: number[][];
  maxDist: number;
  progress: DojoProgress;
  state: FloodState;
  actions: number;
  message: string | undefined;
  error: boolean;
  shake: boolean;
  complete: boolean;
  showIntro: boolean;
  nextId: string | null;
  completedCount: number;
  selectLevel: (id: string) => void;
  resetLevel: () => void;
  dismissIntro: () => void;
  handleKey: (key: string) => boolean;
}

const FloodGameContext = createContext<FloodGameContextValue | null>(null);

export function FloodGameProvider({ children }: { children: ReactNode }) {
  const [levelId, setLevelId] = useState(levelFromHash);
  const progress = store.use();
  const level = useMemo(() => getLevel(levelId) ?? LEVELS[0]!, [levelId]);
  const parsed = useMemo(() => parseGrid(level.grid), [level]);
  const reference = useMemo(() => referenceDistances(parsed), [parsed]);
  const maxDist = useMemo(() => maxDistance(reference), [reference]);

  const [state, setState] = useState<FloodState>(() => createState(parsed));
  const [actions, setActions] = useState(0);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [complete, setComplete] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset synchronously during render so no frame ever pairs the new level's
  // grid with the previous level's state (a mismatch crashes FloodBoard).
  const [renderedLevelId, setRenderedLevelId] = useState(levelId);
  if (renderedLevelId !== levelId) {
    setRenderedLevelId(levelId);
    setState(createState(parsed));
    setActions(0);
    setMessage(undefined);
    setError(false);
    setShake(false);
    setComplete(false);
    setShowIntro(true);
  }

  const triggerShake = useCallback(() => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    setShake(true);
    shakeTimer.current = setTimeout(() => setShake(false), 300);
  }, []);

  useEffect(
    () => () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    },
    [],
  );

  const resetLevel = useCallback(() => {
    setState(createState(parsed));
    setActions(0);
    setMessage(undefined);
    setError(false);
    setShake(false);
    setComplete(false);
  }, [parsed]);

  const selectLevel = useCallback((id: string) => {
    if (!getLevel(id)) return;
    setLevelId(id);
    writeDojoHash({ gameId: FLOOD_GAME_ID, levelId: id });
  }, []);

  const dismissIntro = useCallback(() => setShowIntro(false), []);

  // Normalize corrupt or missing deep links to the resolved level.
  useEffect(() => {
    if (typeof location === 'undefined') return;
    const parsedHash = parseDojoHash(location.hash, location.pathname);
    if (parsedHash && parsedHash.levelId !== levelId) {
      writeDojoHash({ gameId: FLOOD_GAME_ID, levelId }, { replace: true });
    }
  }, []);

  /** A wrong pick is a mistake: it still costs an action, per the dojo rules. */
  const failAction = useCallback(
    (msg: string) => {
      playDojoError();
      triggerShake();
      setError(true);
      setMessage(msg);
      setActions((a) => a + 1);
    },
    [triggerShake],
  );

  const finishLevel = useCallback(
    (spent: number, msg: string) => {
      setComplete(true);
      setMessage(msg);
      playDojoSuccess();
      store.markLevelComplete(level.id, spent, starsForMoves(spent, level.par));
    },
    [level.id, level.par],
  );

  const pickFrontier = useCallback(
    (pos: number) => {
      const result = expandAt(parsed, state, pos);
      if (!result.ok) {
        if (result.reason === 'outOfRange') {
          failAction(
            `The queue holds only ${state.queue.length} cell${state.queue.length === 1 ? '' : 's'} — there is no #${pos}.`,
          );
        } else if (result.reason === 'notHead') {
          const cell = state.queue[pos - 1]!;
          const head = state.queue[0]!;
          failAction(
            `Cell #${pos} at (${cell.r},${cell.c}) was discovered later — BFS serves the oldest first (FIFO). Expand #1 at (${head.r},${head.c}).`,
          );
        } else {
          failAction('The queue is empty — nothing left to expand.');
        }
        return;
      }

      const spent = actions + 1;
      setActions(spent);
      setState(result.state);
      setError(false);

      const d = result.expandedDist;
      const found = result.discoveredCells.length;
      if (isComplete(parsed, result.state)) {
        if (parsed.star) {
          const sd = result.state.dist[parsed.star.r]![parsed.star.c]!;
          finishLevel(
            spent,
            `Star discovered — shortest path: ${sd} steps. BFS reaches everything at distance ${sd} before anything at ${sd + 1}.`,
          );
        } else {
          finishLevel(
            spent,
            `Fully flooded — every cell wears its true shortest distance from the spring${parsed.sources.length > 1 ? 's' : ''}.`,
          );
        }
        return;
      }

      if (found > 0) {
        playDojoMelody(result.discoveredCells.map((_, i) => d + 1 + i));
        setMessage(
          `Expanded the head at distance ${d} — ${found} neighbor${found === 1 ? '' : 's'} join${found === 1 ? 's' : ''} the tail at distance ${d + 1}.`,
        );
      } else {
        playDojoTone(d);
        setMessage(
          `Expanded the head at distance ${d} — no new cells; the ripple already passed here.`,
        );
      }
    },
    [actions, failAction, finishLevel, parsed, state],
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
      if (key >= '1' && key <= '9') {
        pickFrontier(Number(key));
      } else {
        switch (key) {
          case 'Enter':
          case ' ':
            pickFrontier(1);
            break;
          case 'r':
          case 'Escape':
            resetLevel();
            break;
          case '[':
          case ']': {
            const idx = LEVEL_IDS.indexOf(level.id) + (key === '[' ? -1 : 1);
            const target = LEVEL_IDS[idx];
            if (target && isDojoLevelUnlocked(LEVEL_IDS, idx, store.read())) selectLevel(target);
            break;
          }
          default:
            handled = false;
        }
      }
      if (handled) setShowIntro(false);
      return handled;
    },
    [complete, level.id, pickFrontier, resetLevel, selectLevel],
  );

  const nextId = nextLevelId(level.id);
  const completedCount = dojoCompletedCount(LEVEL_IDS, progress);

  const value = useMemo<FloodGameContextValue>(
    () => ({
      levelId,
      level,
      parsed,
      reference,
      maxDist,
      progress,
      state,
      actions,
      message,
      error,
      shake,
      complete,
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
      parsed,
      reference,
      maxDist,
      progress,
      state,
      actions,
      message,
      error,
      shake,
      complete,
      showIntro,
      nextId,
      completedCount,
      selectLevel,
      resetLevel,
      dismissIntro,
      handleKey,
    ],
  );

  return <FloodGameContext.Provider value={value}>{children}</FloodGameContext.Provider>;
}

export function useFloodGame(): FloodGameContextValue {
  const ctx = useContext(FloodGameContext);
  if (!ctx) throw new Error('useFloodGame must be used within FloodGameProvider');
  return ctx;
}
