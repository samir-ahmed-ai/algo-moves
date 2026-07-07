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
  declareAbsent,
  discard,
  getLevel,
  nextLevelId,
  probe,
  rangeEmpty,
  type BisectLevel,
  type BisectState,
  type DiscardKey,
} from './engine/search';

export const BISECT_GAME_ID = 'binary-search';

const store = getDojoProgressStore(BISECT_GAME_ID);

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

export interface BisectGameContextValue {
  levelId: string;
  level: BisectLevel;
  progress: DojoProgress;
  state: BisectState;
  empty: boolean;
  actions: number;
  message: string | undefined;
  error: boolean;
  shake: boolean;
  complete: boolean;
  /** Index the level finished on (found / first duplicate), null for absence proofs. */
  foundIndex: number | null;
  showIntro: boolean;
  nextId: string | null;
  completedCount: number;
  selectLevel: (id: string) => void;
  resetLevel: () => void;
  dismissIntro: () => void;
  handleKey: (key: string) => boolean;
}

const BisectGameContext = createContext<BisectGameContextValue | null>(null);

export function BisectGameProvider({ children }: { children: ReactNode }) {
  const [levelId, setLevelId] = useState(levelFromHash);
  const progress = store.use();
  const level = useMemo(() => getLevel(levelId) ?? LEVELS[0]!, [levelId]);

  const [state, setState] = useState<BisectState>(() => createState(level));
  const [actions, setActions] = useState(0);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [complete, setComplete] = useState(false);
  const [foundIndex, setFoundIndex] = useState<number | null>(null);
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
    setFoundIndex(null);
  }, [level]);

  const selectLevel = useCallback((id: string) => {
    if (!getLevel(id)) return;
    setLevelId(id);
    writeDojoHash({ gameId: BISECT_GAME_ID, levelId: id });
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
      writeDojoHash({ gameId: BISECT_GAME_ID, levelId }, { replace: true });
    }
  }, []);

  const vals = level.values;
  const t = level.target;
  const empty = rangeEmpty(state);

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
    (spent: number, msg: string, index: number | null) => {
      setActions(spent);
      setComplete(true);
      setMessage(msg);
      setFoundIndex(index);
      playDojoSuccess();
      store.markLevelComplete(level.id, spent, starsForMoves(spent, level.par));
    },
    [level.id, level.par],
  );

  const probeMid = useCallback(() => {
    const result = probe(level, state);
    if (!result.ok) {
      if (result.reason === 'empty') {
        failAction(
          `Nothing left to flip — every card is ruled out and ${t} never showed. Declare "not here" with x.`,
        );
      } else {
        const i = state.probedMid!;
        failAction(
          `Index ${i} is already face-up showing ${vals[i]} — decide: discard a half with l or h.`,
        );
      }
      return;
    }
    const spent = actions + 1;
    if (result.outcome === 'found') {
      setState(result.state);
      setError(false);
      finishLevel(
        spent,
        `Flipped index ${result.index}: ${result.value} == ${t} — target found!`,
        result.index,
      );
      return;
    }
    setActions(spent);
    setState(result.state);
    setError(false);
    playDojoTone(spent - 1);
    if (result.outcome === 'candidate') {
      setMessage(
        `${result.value} == ${t} at index ${result.index} — a candidate! But is it the FIRST? Keep looking left with h.`,
      );
    } else if (result.value < t) {
      setMessage(
        `Flipped index ${result.index}: ${result.value} < ${t} — the target can't be on the left. Discard it with l.`,
      );
    } else {
      setMessage(
        `Flipped index ${result.index}: ${result.value} > ${t} — the target can't be on the right. Discard it with h.`,
      );
    }
  }, [actions, failAction, finishLevel, level, state, t, vals]);

  const discardHalf = useCallback(
    (key: DiscardKey) => {
      const result = discard(level, state, key);
      if (!result.ok) {
        if (result.reason === 'empty') {
          failAction(`The range is already empty — there is nothing left to discard. Press x.`);
        } else if (result.reason === 'notProbed') {
          failAction(
            `Probe before you discard — flip the middle card with m first, then let the comparison choose the half.`,
          );
        } else if (result.reason === 'keepLeft') {
          failAction(
            `Found one ${t} at index ${state.probedMid} — but is it the FIRST? Keep looking left with h.`,
          );
        } else {
          const v = vals[state.probedMid!]!;
          failAction(
            key === 'l'
              ? `${v} > ${t} — the target can't be on the right. Discard the right half with h.`
              : `${v} < ${t} — the target can't be on the left. Discard the left half with l.`,
          );
        }
        return;
      }
      const i = state.probedMid!;
      const v = vals[i]!;
      const spent = actions + 1;
      if (result.outcome === 'lowerBoundComplete') {
        setState(result.state);
        setError(false);
        finishLevel(
          spent,
          `Range empty — index ${result.state.candidate} holds the FIRST ${t}. That's lower_bound.`,
          result.state.candidate,
        );
        return;
      }
      setActions(spent);
      setState(result.state);
      setError(false);
      playDojoTone(spent - 1);
      const left = rangeEmpty(result.state) ? 0 : result.state.hi - result.state.lo + 1;
      if (v === t) {
        setMessage(
          `Candidate ${t} kept at index ${result.state.candidate} — now searching left of index ${i} (${left} card${left === 1 ? '' : 's'} left).`,
        );
      } else if (key === 'l') {
        setMessage(
          `${v} < ${t} — indices ${state.lo}..${i} can't hold the target; gone. ${left} card${left === 1 ? '' : 's'} left.`,
        );
      } else {
        setMessage(
          `${v} > ${t} — indices ${i}..${state.hi} can't hold the target; gone. ${left} card${left === 1 ? '' : 's'} left.`,
        );
      }
    },
    [actions, failAction, finishLevel, level, state, t, vals],
  );

  const declareNotHere = useCallback(() => {
    const result = declareAbsent(level, state);
    if (!result.ok) {
      if (result.reason === 'lowerBound') {
        failAction(
          state.candidate !== null
            ? `${t} is provably here — you saw it at index ${state.candidate}. Find the FIRST copy: keep left with h.`
            : `Your job is to find the FIRST ${t}, not prove absence — keep bisecting with m.`,
        );
      } else {
        const count = state.hi - state.lo + 1;
        failAction(
          `Too early — indices ${state.lo}..${state.hi} still hold ${count} possibilit${count === 1 ? 'y' : 'ies'}. Absence is only proven by an EMPTY range.`,
        );
      }
      return;
    }
    setError(false);
    finishLevel(
      actions + 1,
      `Empty range — proof complete: ${t} is nowhere in the deck. This is where code returns -1.`,
      null,
    );
  }, [actions, failAction, finishLevel, level, state, t]);

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
        case 'm':
        case 'Enter':
        case ' ':
          probeMid();
          break;
        case 'l':
          discardHalf('l');
          break;
        case 'h':
          discardHalf('h');
          break;
        case 'x':
          declareNotHere();
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
    [complete, declareNotHere, discardHalf, level.id, probeMid, resetLevel, selectLevel],
  );

  const nextId = nextLevelId(level.id);
  const completedCount = dojoCompletedCount(LEVEL_IDS, progress);

  const value = useMemo<BisectGameContextValue>(
    () => ({
      levelId,
      level,
      progress,
      state,
      empty,
      actions,
      message,
      error,
      shake,
      complete,
      foundIndex,
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
      empty,
      actions,
      message,
      error,
      shake,
      complete,
      foundIndex,
      showIntro,
      nextId,
      completedCount,
      selectLevel,
      resetLevel,
      dismissIntro,
      handleKey,
    ],
  );

  return <BisectGameContext.Provider value={value}>{children}</BisectGameContext.Provider>;
}

export function useBisectGame(): BisectGameContextValue {
  const ctx = useContext(BisectGameContext);
  if (!ctx) throw new Error('useBisectGame must be used within BisectGameProvider');
  return ctx;
}
