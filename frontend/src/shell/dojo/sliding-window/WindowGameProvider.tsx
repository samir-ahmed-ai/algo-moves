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
  applyMove,
  chipLabel,
  createState,
  getLevel,
  isDone,
  isValidWindow,
  meterValue,
  nextLevelId,
  type WindowLevel,
  type WindowMove,
  type WindowState,
} from './engine/window';

export const WINDOW_GAME_ID = 'sliding-window';

const store = getDojoProgressStore(WINDOW_GAME_ID);

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

export interface WindowGameContextValue {
  levelId: string;
  level: WindowLevel;
  progress: DojoProgress;
  state: WindowState;
  meter: number;
  valid: boolean;
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

const WindowGameContext = createContext<WindowGameContextValue | null>(null);

export function WindowGameProvider({ children }: { children: ReactNode }) {
  const [levelId, setLevelId] = useState(levelFromHash);
  const progress = store.use();
  const level = useMemo(() => getLevel(levelId) ?? LEVELS[0]!, [levelId]);

  const [state, setState] = useState<WindowState>(() => createState(level));
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
    writeDojoHash({ gameId: WINDOW_GAME_ID, levelId: id });
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
      writeDojoHash({ gameId: WINDOW_GAME_ID, levelId }, { replace: true });
    }
  }, []);

  const meter = meterValue(state);
  const valid = isValidWindow(state);

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

  const attemptMove = useCallback(
    (move: WindowMove) => {
      const result = applyMove(state, move);
      if (!result.ok) {
        const kinds = `${meter} kind${meter === 1 ? '' : 's'}`;
        if (result.forced === 'done') {
          failAction('R already sits on the last chip — the pass is over.');
        } else if (level.mode === 'min-sum') {
          failAction(
            move === 'grow'
              ? `sum ${meter} ≥ ${level.target} — it qualifies; shrink with h to hunt something shorter.`
              : `sum ${meter} < ${level.target} — it can't qualify yet; grow with l to pull in more.`,
          );
        } else {
          failAction(
            move === 'grow'
              ? `${kinds} > ${level.target} — one kind too many; shrink with h until a kind drops out.`
              : `${kinds} ≤ ${level.target} — the basket is legal; grow with l to stretch it.`,
          );
        }
        return;
      }

      const next = result.state;
      const spent = actions + 1;
      setActions(spent);
      setState(next);
      setError(false);

      const nextMeter = meterValue(next);
      const chipIdx = move === 'grow' ? next.r : next.l - 1;
      const chip = chipLabel(level, level.values[chipIdx]!);
      const reading =
        level.mode === 'min-sum'
          ? `sum ${nextMeter} vs ${level.target}`
          : `${nextMeter} kind${nextMeter === 1 ? '' : 's'} vs limit ${level.target}`;
      let msg =
        move === 'grow'
          ? `Grew — pulled in ${chip}; ${reading}.`
          : `Shrank — dropped ${chip}; ${reading}.`;
      if (result.improved && next.best) {
        msg += ` New best: length ${next.best.len}!`;
        playDojoMelody([spent - 1, spent + 3]);
      } else {
        playDojoTone(spent - 1);
      }

      if (isDone(next)) {
        const best = next.best;
        setComplete(true);
        setMessage(
          best
            ? `R walked off the end — best window: chips ${best.l}–${best.r}, length ${best.len}.`
            : 'R walked off the end — the pass is over.',
        );
        playDojoSuccess();
        store.markLevelComplete(level.id, spent, starsForMoves(spent, level.par));
        return;
      }
      setMessage(msg);
    },
    [actions, failAction, level, meter, state],
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
        case 'l':
        case 'ArrowRight':
          attemptMove('grow');
          break;
        case 'h':
        case 'ArrowLeft':
          attemptMove('shrink');
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
    [attemptMove, complete, level.id, resetLevel, selectLevel],
  );

  const nextId = nextLevelId(level.id);
  const completedCount = dojoCompletedCount(LEVEL_IDS, progress);

  const value = useMemo<WindowGameContextValue>(
    () => ({
      levelId,
      level,
      progress,
      state,
      meter,
      valid,
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
      meter,
      valid,
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

  return <WindowGameContext.Provider value={value}>{children}</WindowGameContext.Provider>;
}

export function useWindowGame(): WindowGameContextValue {
  const ctx = useContext(WindowGameContext);
  if (!ctx) throw new Error('useWindowGame must be used within WindowGameProvider');
  return ctx;
}
