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
  createDp,
  currentCell,
  fillValidity,
  getLevel,
  nextLevelId,
  stampInfinityValidity,
  traceback,
  type DpCell,
  type ForgeLevel,
  type Traceback,
} from './engine/forge';

export const FORGE_GAME_ID = 'dp-coins';

const store = getDojoProgressStore(FORGE_GAME_ID);

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

interface Flash {
  cell: number;
  seq: number;
}

export interface ForgeGameContextValue {
  levelId: string;
  level: ForgeLevel;
  progress: DojoProgress;
  dp: DpCell[];
  cursor: number;
  actions: number;
  message: string | undefined;
  error: boolean;
  shake: boolean;
  complete: boolean;
  trace: Traceback | null;
  flash: Flash | null;
  showIntro: boolean;
  nextId: string | null;
  completedCount: number;
  selectLevel: (id: string) => void;
  resetLevel: () => void;
  dismissIntro: () => void;
  handleKey: (key: string) => boolean;
}

const ForgeGameContext = createContext<ForgeGameContextValue | null>(null);

export function ForgeGameProvider({ children }: { children: ReactNode }) {
  const [levelId, setLevelId] = useState(levelFromHash);
  const progress = store.use();
  const level = useMemo(() => getLevel(levelId) ?? LEVELS[0]!, [levelId]);

  const [dp, setDp] = useState<DpCell[]>(() => createDp(level));
  const [actions, setActions] = useState(0);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [complete, setComplete] = useState(false);
  const [trace, setTrace] = useState<Traceback | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashSeq = useRef(0);

  const triggerShake = useCallback(() => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    setShake(true);
    shakeTimer.current = setTimeout(() => setShake(false), 300);
  }, []);

  /** Pulse the referenced cell i − c so the player sees where the value came from. */
  const flashCell = useCallback((cell: number) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashSeq.current += 1;
    setFlash({ cell, seq: flashSeq.current });
    flashTimer.current = setTimeout(() => setFlash(null), 500);
  }, []);

  useEffect(
    () => () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const resetLevel = useCallback(() => {
    setDp(createDp(level));
    setActions(0);
    setMessage(undefined);
    setError(false);
    setShake(false);
    setComplete(false);
    setTrace(null);
    setFlash(null);
  }, [level]);

  const selectLevel = useCallback((id: string) => {
    if (!getLevel(id)) return;
    setLevelId(id);
    writeDojoHash({ gameId: FORGE_GAME_ID, levelId: id });
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
      writeDojoHash({ gameId: FORGE_GAME_ID, levelId }, { replace: true });
    }
  }, []);

  const cursor = currentCell(dp);

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
    (finalDp: DpCell[], spent: number) => {
      const result = traceback(finalDp, level.coins, level.n);
      setTrace(result);
      setComplete(true);
      if (result) {
        const multiset = [...result.coins].sort((a, b) => b - a);
        setMessage(
          `dp[${level.n}] = ${finalDp[level.n]} — traced back: ${multiset.join('¢ + ')}¢ = ${level.n}¢.`,
        );
      } else {
        setMessage(`dp[${level.n}] = ∞ — no coin combination forges ${level.n}¢.`);
      }
      playDojoSuccess();
      store.markLevelComplete(level.id, spent, starsForMoves(spent, level.par));
    },
    [level],
  );

  const pressCoin = useCallback(
    (coin: number) => {
      if (cursor === -1) return;
      const i = cursor;
      if (coin <= i) flashCell(i - coin);
      const result = fillValidity(dp, i, coin, level.coins);
      if (!result.ok) {
        if (result.reason === 'doesntFit') {
          failAction(`${coin}¢ doesn't fit into ${i} — a coin can't exceed the amount it forges.`);
        } else if (result.reason === 'mustStamp') {
          failAction(
            `No coin reaches ${i}¢ — every reference is ∞ or doesn't fit. Stamp ∞ with x.`,
          );
        } else if (result.reason === 'unreachableRef') {
          failAction(
            `Via ${coin}¢: dp[${i - coin}] is ∞ — you can't forge from an unreachable past. Via ${result.best.coin}¢: 1+dp[${result.best.ref}]=${result.best.candidate}.`,
          );
        } else {
          failAction(
            `Via ${coin}¢: 1+dp[${result.chosen.ref}]=${result.chosen.candidate}. Via ${result.best.coin}¢: 1+dp[${result.best.ref}]=${result.best.candidate} — forge from the cheaper past.`,
          );
        }
        return;
      }
      const spent = actions + 1;
      const nextDp = dp.slice();
      nextDp[i] = result.value;
      setDp(nextDp);
      setActions(spent);
      setError(false);
      playDojoTone(spent - 1);
      setMessage(
        `dp[${i}] = 1 + dp[${result.ref}] = ${result.value} — forged via the ${coin}¢ coin.`,
      );
      if (i === level.n) finishLevel(nextDp, spent);
    },
    [actions, cursor, dp, failAction, finishLevel, flashCell, level],
  );

  const pressStamp = useCallback(() => {
    if (cursor === -1) return;
    const i = cursor;
    const result = stampInfinityValidity(dp, i, level.coins);
    if (!result.ok) {
      failAction(
        `dp[${i}] is reachable — via ${result.best.coin}¢: 1+dp[${result.best.ref}]=${result.best.candidate}. ∞ is only for cells no coin can reach.`,
      );
      return;
    }
    const spent = actions + 1;
    const nextDp = dp.slice();
    nextDp[i] = Infinity;
    setDp(nextDp);
    setActions(spent);
    setError(false);
    playDojoTone(spent - 1);
    setMessage(`dp[${i}] = ∞ — no combination of {${level.coins.join(', ')}} makes ${i}¢.`);
    if (i === level.n) finishLevel(nextDp, spent);
  }, [actions, cursor, dp, failAction, finishLevel, level]);

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
      if (/^[1-9]$/.test(key) && level.coins.includes(Number(key))) {
        pressCoin(Number(key));
      } else {
        switch (key) {
          case 'x':
            pressStamp();
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
    [complete, level.coins, level.id, pressCoin, pressStamp, resetLevel, selectLevel],
  );

  const nextId = nextLevelId(level.id);
  const completedCount = dojoCompletedCount(LEVEL_IDS, progress);

  const value = useMemo<ForgeGameContextValue>(
    () => ({
      levelId,
      level,
      progress,
      dp,
      cursor,
      actions,
      message,
      error,
      shake,
      complete,
      trace,
      flash,
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
      dp,
      cursor,
      actions,
      message,
      error,
      shake,
      complete,
      trace,
      flash,
      showIntro,
      nextId,
      completedCount,
      selectLevel,
      resetLevel,
      dismissIntro,
      handleKey,
    ],
  );

  return <ForgeGameContext.Provider value={value}>{children}</ForgeGameContext.Provider>;
}

export function useForgeGame(): ForgeGameContextValue {
  const ctx = useContext(ForgeGameContext);
  if (!ctx) throw new Error('useForgeGame must be used within ForgeGameProvider');
  return ctx;
}
