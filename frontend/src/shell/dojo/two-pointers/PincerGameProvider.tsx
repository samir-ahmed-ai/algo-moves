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
  claimValidity,
  createState,
  crossed,
  getLevel,
  moveValidity,
  nextLevelId,
  noPairValidity,
  sumAt,
  type PincerLevel,
  type PincerState,
  type PointerKey,
} from './engine/pincer';

export const PINCER_GAME_ID = 'two-pointers';

const store = getDojoProgressStore(PINCER_GAME_ID);

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

export interface PincerGameContextValue {
  levelId: string;
  level: PincerLevel;
  progress: DojoProgress;
  state: PincerState;
  sum: number;
  crossed: boolean;
  actions: number;
  message: string | undefined;
  error: boolean;
  shake: boolean;
  complete: boolean;
  foundPair: boolean;
  showIntro: boolean;
  nextId: string | null;
  completedCount: number;
  selectLevel: (id: string) => void;
  resetLevel: () => void;
  dismissIntro: () => void;
  handleKey: (key: string) => boolean;
}

const PincerGameContext = createContext<PincerGameContextValue | null>(null);

export function PincerGameProvider({ children }: { children: ReactNode }) {
  const [levelId, setLevelId] = useState(levelFromHash);
  const progress = store.use();
  const level = useMemo(() => getLevel(levelId) ?? LEVELS[0]!, [levelId]);

  const [state, setState] = useState<PincerState>(() => createState(level));
  const [actions, setActions] = useState(0);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [complete, setComplete] = useState(false);
  const [foundPair, setFoundPair] = useState(false);
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
    setFoundPair(false);
  }, [level]);

  const selectLevel = useCallback((id: string) => {
    if (!getLevel(id)) return;
    setLevelId(id);
    writeDojoHash({ gameId: PINCER_GAME_ID, levelId: id });
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
      writeDojoHash({ gameId: PINCER_GAME_ID, levelId }, { replace: true });
    }
  }, []);

  const vals = level.values;
  const sum = sumAt(level, state);
  const met = crossed(state);

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

  const movePointer = useCallback(
    (key: PointerKey) => {
      const result = moveValidity(level, state, key);
      if (!result.ok) {
        if (result.reason === 'crossed') {
          failAction(
            `L and R have met at index ${state.l} — every element is ruled out. Declare no pair with x.`,
          );
        } else if (result.reason === 'needClaim') {
          failAction(
            `${vals[state.l]} + ${vals[state.r]} = ${level.target} — that IS the target. Claim the pair with Enter, don't walk past it.`,
          );
        } else if (key === 'l') {
          failAction(
            `${vals[state.l]} + ${vals[state.r]} = ${sum} > ${level.target} — the right value ${vals[state.r]} is too big; walk R left with h.`,
          );
        } else {
          failAction(
            `${vals[state.l]} + ${vals[state.r]} = ${sum} < ${level.target} — the left value ${vals[state.l]} is too small; walk L right with l.`,
          );
        }
        return;
      }
      const spent = actions + 1;
      setActions(spent);
      setState(result.state);
      setError(false);
      playDojoTone(spent - 1);
      if (key === 'l') {
        setMessage(
          `${sum} < ${level.target} — ${vals[state.l]} can't pair with anything ≤ ${vals[state.r]}; ruled out.`,
        );
      } else {
        setMessage(
          `${sum} > ${level.target} — ${vals[state.r]} overshoots with anything ≥ ${vals[state.l]}; ruled out.`,
        );
      }
    },
    [actions, failAction, level, state, sum, vals],
  );

  const claimPair = useCallback(() => {
    const result = claimValidity(level, state);
    if (!result.ok) {
      if (result.reason === 'crossed') {
        failAction(
          'The pointers have met — there is no pair under them to claim. Declare no pair with x.',
        );
      } else if (result.reason === 'tooSmall') {
        failAction(
          `${vals[state.l]} + ${vals[state.r]} = ${sum} < ${level.target} — not the pair; the sum falls short. Walk L right with l.`,
        );
      } else {
        failAction(
          `${vals[state.l]} + ${vals[state.r]} = ${sum} > ${level.target} — not the pair; the sum overshoots. Walk R left with h.`,
        );
      }
      return;
    }
    setFoundPair(true);
    setError(false);
    finishLevel(
      actions + 1,
      `${vals[state.l]} + ${vals[state.r]} = ${level.target} — pair claimed!`,
    );
  }, [actions, failAction, finishLevel, level, state, sum, vals]);

  const declareNoPair = useCallback(() => {
    const result = noPairValidity(level, state);
    if (!result.ok) {
      if (result.reason === 'pairHere') {
        failAction(
          `${vals[state.l]} + ${vals[state.r]} = ${level.target} — the pair is right under your pointers! Claim it with Enter.`,
        );
      } else {
        failAction(
          `Too early — L is on ${vals[state.l]} and R is on ${vals[state.r]} with elements still between them. Keep squeezing until they meet.`,
        );
      }
      return;
    }
    setError(false);
    finishLevel(actions + 1, 'The pointers met — no pair exists, and one pass proved it.');
  }, [actions, failAction, finishLevel, level, state, vals]);

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

      // While the intro card is up, Enter/Space activate its focused
      // "Start level" button — never claimPair, which would burn an action.
      if (showIntro && (key === 'Enter' || key === ' ')) {
        setShowIntro(false);
        return true;
      }

      let handled = true;
      switch (key) {
        case 'l':
        case 'ArrowRight':
          movePointer('l');
          break;
        case 'h':
        case 'ArrowLeft':
          movePointer('h');
          break;
        case 'Enter':
        case ' ':
          claimPair();
          break;
        case 'x':
          declareNoPair();
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
    [claimPair, complete, declareNoPair, level.id, movePointer, resetLevel, selectLevel, showIntro],
  );

  const nextId = nextLevelId(level.id);
  const completedCount = dojoCompletedCount(LEVEL_IDS, progress);

  const value = useMemo<PincerGameContextValue>(
    () => ({
      levelId,
      level,
      progress,
      state,
      sum,
      crossed: met,
      actions,
      message,
      error,
      shake,
      complete,
      foundPair,
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
      sum,
      met,
      actions,
      message,
      error,
      shake,
      complete,
      foundPair,
      showIntro,
      nextId,
      completedCount,
      selectLevel,
      resetLevel,
      dismissIntro,
      handleKey,
    ],
  );

  return <PincerGameContext.Provider value={value}>{children}</PincerGameContext.Provider>;
}

export function usePincerGame(): PincerGameContextValue {
  const ctx = useContext(PincerGameContext);
  if (!ctx) throw new Error('usePincerGame must be used within PincerGameProvider');
  return ctx;
}
