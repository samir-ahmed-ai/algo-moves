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
  applyMove,
  createState,
  getLevel,
  isComplete,
  nextLevelId,
  type HeapLevel,
  type HeapMove,
  type HeapState,
} from './engine/heap';

export const HEAP_GAME_ID = 'heap';

const store = getDojoProgressStore(HEAP_GAME_ID);

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

export interface HeapGameContextValue {
  levelId: string;
  level: HeapLevel;
  progress: DojoProgress;
  state: HeapState;
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

const HeapGameContext = createContext<HeapGameContextValue | null>(null);

export function HeapGameProvider({ children }: { children: ReactNode }) {
  const [levelId, setLevelId] = useState(levelFromHash);
  const progress = store.use();
  const level = useMemo(() => getLevel(levelId) ?? LEVELS[0]!, [levelId]);

  const [state, setState] = useState<HeapState>(() => createState(level));
  const [actions, setActions] = useState(0);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [complete, setComplete] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setState(createState(level));
    setActions(0);
    setMessage(undefined);
    setError(false);
    setShake(false);
    setComplete(false);
  }, [level]);

  const selectLevel = useCallback((id: string) => {
    if (!getLevel(id)) return;
    setLevelId(id);
    writeDojoHash({ gameId: HEAP_GAME_ID, levelId: id });
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
      writeDojoHash({ gameId: HEAP_GAME_ID, levelId }, { replace: true });
    }
  }, []);

  /** A wrong action is a mistake: it still costs an action, per the dojo rules. */
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

  const playMove = useCallback(
    (move: HeapMove) => {
      const before = state;
      const result = applyMove(before, move);
      if (!result.ok) {
        failAction(result.message);
        return;
      }
      const spent = actions + 1;
      setActions(spent);
      setState(result.state);
      setError(false);
      playDojoTone(spent - 1);

      const i = before.phase.kind === 'done' ? 0 : before.phase.index;
      const v = before.heap[i]!;
      let msg: string;
      if (result.kind === 'swap') {
        const displaced = before.heap[result.index]!;
        msg =
          move === 'up'
            ? `${v} < ${displaced} — swapped up into slot ${result.index}; keep checking the parent.`
            : `${v} > ${displaced} — swapped down into slot ${result.index}; keep checking the children.`;
      } else if (result.servedNow.length > 0) {
        const served = result.servedNow.join(', then ');
        msg =
          result.state.phase.kind === 'siftDown'
            ? `${v} settles — pop serves ${served} and the last slot's value takes the root.`
            : `${v} settles — pop serves ${served} and the heap runs empty.`;
      } else {
        msg = `${v} settles in slot ${i} — every parent ≤ its children again.`;
      }

      if (isComplete(result.state)) {
        finishLevel(spent, msg);
      } else {
        setMessage(msg);
      }
    },
    [actions, failAction, finishLevel, state],
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
      switch (key) {
        case 'u':
        case 'ArrowUp':
          playMove('up');
          break;
        case 'h':
        case 'ArrowLeft':
          playMove('left');
          break;
        case 'l':
        case 'ArrowRight':
          playMove('right');
          break;
        case 'Enter':
        case ' ':
          playMove('settle');
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
      if (handled) setShowIntro(false);
      return handled;
    },
    [complete, level.id, playMove, resetLevel, selectLevel],
  );

  const nextId = nextLevelId(level.id);
  const completedCount = dojoCompletedCount(LEVEL_IDS, progress);

  const value = useMemo<HeapGameContextValue>(
    () => ({
      levelId,
      level,
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

  return <HeapGameContext.Provider value={value}>{children}</HeapGameContext.Provider>;
}

export function useHeapGame(): HeapGameContextValue {
  const ctx = useContext(HeapGameContext);
  if (!ctx) throw new Error('useHeapGame must be used within HeapGameProvider');
  return ctx;
}
