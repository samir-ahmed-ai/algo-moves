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
  canPush,
  createState,
  getLevel,
  inputDone,
  mustPop,
  needsSweep,
  nextLevelId,
  popResolve,
  pushNext,
  sweepOne,
  type SkylineLevel,
  type SkylineState,
} from './engine/skyline';

export const MONO_STACK_GAME_ID = 'mono-stack';

const store = getDojoProgressStore(MONO_STACK_GAME_ID);

const SWEEP_STEP_MS = 380;

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

/** Answer badge text for a bar, respecting the daily-temperatures theme. */
export function answerLabel(level: SkylineLevel, index: number, answer: number | 'none'): string {
  if (level.theme === 'days') {
    return answer === 'none' ? '0d' : `${answer - index}d`;
  }
  return answer === 'none' ? 'none' : `→${level.heights[answer]}`;
}

export interface SkylineGameContextValue {
  levelId: string;
  level: SkylineLevel;
  progress: DojoProgress;
  state: SkylineState;
  actions: number;
  message: string | undefined;
  error: boolean;
  shake: boolean;
  complete: boolean;
  sweeping: boolean;
  showIntro: boolean;
  canPushNow: boolean;
  mustPopNow: boolean;
  nextId: string | null;
  completedCount: number;
  selectLevel: (id: string) => void;
  resetLevel: () => void;
  dismissIntro: () => void;
  handleKey: (key: string) => boolean;
}

const SkylineGameContext = createContext<SkylineGameContextValue | null>(null);

export function SkylineGameProvider({ children }: { children: ReactNode }) {
  const [levelId, setLevelId] = useState(levelFromHash);
  const progress = store.use();
  const level = useMemo(() => getLevel(levelId) ?? LEVELS[0]!, [levelId]);

  const [state, setState] = useState<SkylineState>(() => createState(level));
  const [actions, setActions] = useState(0);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [complete, setComplete] = useState(false);
  const [sweeping, setSweeping] = useState(false);
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
    setSweeping(false);
  }, [level]);

  const selectLevel = useCallback((id: string) => {
    if (!getLevel(id)) return;
    setLevelId(id);
    writeDojoHash({ gameId: MONO_STACK_GAME_ID, levelId: id });
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
      writeDojoHash({ gameId: MONO_STACK_GAME_ID, levelId }, { replace: true });
    }
  }, []);

  const heights = level.heights;

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

  // End sweep: once every bar is pushed, the waiting stack drains to 'none'
  // one chip at a time, then the level completes. Not player actions.
  useEffect(() => {
    if (!sweeping || complete) return;
    if (!needsSweep(state)) {
      setSweeping(false);
      setComplete(true);
      setMessage(undefined);
      playDojoSuccess();
      store.markLevelComplete(level.id, actions, starsForMoves(actions, level.par));
      return;
    }
    const timer = setTimeout(() => {
      const swept = sweepOne(state);
      if (!swept) return;
      playDojoTone(actions + (heights.length - swept.state.stack.length));
      setState(swept.state);
      setMessage(
        level.theme === 'days'
          ? `No warmer day ever comes for the ${heights[swept.resolved]}° day — sweep marks it 0d.`
          : `No taller bar ever came for the ${heights[swept.resolved]}-bar — its next greater is “none”.`,
      );
    }, SWEEP_STEP_MS);
    return () => clearTimeout(timer);
  }, [sweeping, complete, state, actions, level, heights]);

  const popTop = useCallback(() => {
    if (inputDone(state)) return;
    const incoming = heights[state.next]!;
    const result = popResolve(state);
    if (!result.ok) {
      if (result.reason === 'empty') {
        failAction(
          `The stack is empty — no bar is waiting. Push the incoming ${incoming}-bar with Enter.`,
        );
      } else {
        const topH = heights[result.top!]!;
        failAction(
          `${topH} ≥ ${incoming} — the top hasn't met anything taller. It keeps waiting; push the ${incoming}-bar with Enter.`,
        );
      }
      return;
    }
    const spent = actions + 1;
    setActions(spent);
    setState(result.state);
    setError(false);
    playDojoTone(spent - 1);
    setMessage(
      level.theme === 'days'
        ? `Pop! Day ${result.resolved + 1} (${heights[result.resolved]}°) finds its warmer day after ${result.by - result.resolved}d.`
        : `Pop! The ${heights[result.resolved]}-bar meets its next greater: the incoming ${incoming}-bar.`,
    );
  }, [actions, failAction, heights, level.theme, state]);

  const pushIncoming = useCallback(() => {
    if (inputDone(state)) return;
    const incoming = heights[state.next]!;
    const result = pushNext(state);
    if (!result.ok) {
      const topH = heights[result.top!]!;
      failAction(
        `The ${topH}-bar is still waiting and you're taller (${incoming} > ${topH}) — pop it first with p; that's its answer.`,
      );
      return;
    }
    const spent = actions + 1;
    setActions(spent);
    setState(result.state);
    setError(false);
    playDojoTone(spent - 1);
    if (result.wasLast) {
      setSweeping(true);
      setMessage('All bars pushed — sweeping the waiting stack…');
    } else {
      setMessage(`Pushed the ${incoming}-bar — the stack stays decreasing, bottom to top.`);
    }
  }, [actions, failAction, heights, state]);

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

      if (sweeping) {
        if (key === 'r' || key === 'Escape') {
          resetLevel();
          return true;
        }
        // The sweep is automatic — swallow game keys so nothing misfires.
        return key === 'p' || key === 'Enter' || key === ' ';
      }

      let handled = true;
      switch (key) {
        case 'p':
          popTop();
          break;
        case 'Enter':
        case ' ':
          pushIncoming();
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
    [complete, level.id, popTop, pushIncoming, resetLevel, selectLevel, sweeping],
  );

  const nextId = nextLevelId(level.id);
  const completedCount = dojoCompletedCount(LEVEL_IDS, progress);
  const mustPopNow = mustPop(state);
  const canPushNow = canPush(state);

  const value = useMemo<SkylineGameContextValue>(
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
      sweeping,
      showIntro,
      canPushNow,
      mustPopNow,
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
      sweeping,
      showIntro,
      canPushNow,
      mustPopNow,
      nextId,
      completedCount,
      selectLevel,
      resetLevel,
      dismissIntro,
      handleKey,
    ],
  );

  return <SkylineGameContext.Provider value={value}>{children}</SkylineGameContext.Provider>;
}

export function useSkylineGame(): SkylineGameContextValue {
  const ctx = useContext(SkylineGameContext);
  if (!ctx) throw new Error('useSkylineGame must be used within SkylineGameProvider');
  return ctx;
}
