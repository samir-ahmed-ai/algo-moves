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
  applyUnionWithParent,
  componentSize,
  createLevelDsu,
  edgeAnswer,
  getLevel,
  judgeUnionPress,
  nextLevelId,
  rootOf,
  unionBySizeParent,
  type DsuState,
  type UfLevel,
  type UfOp,
} from './engine/dsu';

export const UNION_FIND_GAME_ID = 'union-find';

const store = getDojoProgressStore(UNION_FIND_GAME_ID);

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

export interface BridgeGameContextValue {
  levelId: string;
  level: UfLevel;
  progress: DojoProgress;
  dsu: DsuState;
  bridges: [number, number][];
  opIndex: number;
  op: UfOp | null;
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

const BridgeGameContext = createContext<BridgeGameContextValue | null>(null);

export function BridgeGameProvider({ children }: { children: ReactNode }) {
  const [levelId, setLevelId] = useState(levelFromHash);
  const progress = store.use();
  const level = useMemo(() => getLevel(levelId) ?? LEVELS[0]!, [levelId]);

  const [dsu, setDsu] = useState<DsuState>(() => createLevelDsu(level));
  const [bridges, setBridges] = useState<[number, number][]>(() => [...level.preBridges]);
  const [opIndex, setOpIndex] = useState(0);
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
    setDsu(createLevelDsu(level));
    setBridges([...level.preBridges]);
    setOpIndex(0);
    setActions(0);
    setMessage(undefined);
    setError(false);
    setShake(false);
    setComplete(false);
  }, [level]);

  const selectLevel = useCallback((id: string) => {
    if (!getLevel(id)) return;
    setLevelId(id);
    writeDojoHash({ gameId: UNION_FIND_GAME_ID, levelId: id });
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
      writeDojoHash({ gameId: UNION_FIND_GAME_ID, levelId }, { replace: true });
    }
  }, []);

  const op = level.ops[opIndex] ?? null;

  /** Island key as shown on its keycap ('1'-based). */
  const k = useCallback((i: number) => level.islands[i]?.key ?? String(i + 1), [level]);

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

  const succeedAction = useCallback(
    (msg: string, nextDsu?: DsuState, newBridge?: [number, number]) => {
      const spent = actions + 1;
      setActions(spent);
      setError(false);
      if (nextDsu) setDsu(nextDsu);
      if (newBridge) setBridges((b) => [...b, newBridge]);
      setMessage(msg);
      const nextIdx = opIndex + 1;
      setOpIndex(nextIdx);
      if (nextIdx >= level.ops.length) {
        setComplete(true);
        playDojoSuccess();
        store.markLevelComplete(level.id, spent, starsForMoves(spent, level.par));
      } else {
        playDojoTone(spent - 1);
      }
    },
    [actions, level.id, level.ops.length, level.par, opIndex],
  );

  const answerConnected = useCallback(
    (yes: boolean) => {
      if (!op) return;
      const ra = rootOf(dsu, op.a);
      const rb = rootOf(dsu, op.b);
      const actual = ra === rb;
      if (yes !== actual) {
        failAction(
          actual
            ? `${k(op.a)} and ${k(op.b)} both climb to root ${k(ra)} — same tree. That's a yes.`
            : `${k(op.a)}'s root is ${k(ra)}, ${k(op.b)}'s root is ${k(rb)} — different trees. That's a no.`,
        );
        return;
      }
      succeedAction(
        actual
          ? `Yes — ${k(op.a)} and ${k(op.b)} both climb to root ${k(ra)}: one component.`
          : `No — ${k(op.a)}'s root is ${k(ra)}, ${k(op.b)}'s root is ${k(rb)}: different trees.`,
      );
    },
    [dsu, failAction, k, op, succeedAction],
  );

  const pressIsland = useCallback(
    (idx: number) => {
      if (!op || op.type !== 'union') return;
      const judged = judgeUnionPress(dsu, op.a, op.b, idx);
      if (!judged.ok) {
        if (judged.reason === 'outside') {
          failAction(
            `Island ${k(idx)} is in neither tree — union(${k(op.a)}, ${k(op.b)}) merges ${k(op.a)}'s and ${k(op.b)}'s components. Press one of their roots.`,
          );
        } else if (judged.reason === 'not-root') {
          failAction(
            `${k(idx)} isn't a root — the top of its tree is ${k(judged.root)}. Only a root can adopt.`,
          );
        } else {
          failAction(
            `Root ${k(idx)} leads ${judged.pressedSize} island${judged.pressedSize === 1 ? '' : 's'}, root ${k(judged.otherRoot)} leads ${judged.otherSize} — small under big keeps trees shallow. Press ${k(judged.otherRoot)}.`,
          );
        }
        return;
      }
      const next = applyUnionWithParent(dsu, judged.winner, judged.loser);
      succeedAction(
        `Root ${k(judged.winner)} adopts ${k(judged.loser)}'s tree — one component of ${componentSize(next, judged.winner)}.`,
        next,
        [op.a, op.b],
      );
    },
    [dsu, failAction, k, op, succeedAction],
  );

  const answerEdge = useCallback(
    (pressed: 'c' | 'u') => {
      if (!op) return;
      const want = edgeAnswer(dsu, op.a, op.b);
      if (pressed !== want) {
        if (want === 'c') {
          failAction(
            `${k(op.a)} and ${k(op.b)} already share root ${k(rootOf(dsu, op.a))} — this bridge would only close a cycle. Press c to skip it.`,
          );
        } else {
          failAction(
            `${k(op.a)}'s root is ${k(rootOf(dsu, op.a))}, ${k(op.b)}'s root is ${k(rootOf(dsu, op.b))} — different trees, so this bridge is useful. Press u to build it.`,
          );
        }
        return;
      }
      if (want === 'c') {
        succeedAction(
          `Cycle — ${k(op.a)} and ${k(op.b)} already share root ${k(rootOf(dsu, op.a))}. Kruskal skips it.`,
        );
        return;
      }
      const winner = unionBySizeParent(dsu, op.a, op.b)!;
      const ra = rootOf(dsu, op.a);
      const loser = winner === ra ? rootOf(dsu, op.b) : ra;
      const next = applyUnionWithParent(dsu, winner, loser);
      succeedAction(
        `Built — union by size hangs root ${k(loser)} under root ${k(winner)}: ${componentSize(next, winner)} islands connected.`,
        next,
        [op.a, op.b],
      );
    },
    [dsu, failAction, k, op, succeedAction],
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
      if (key === 'r' || key === 'Escape') {
        resetLevel();
      } else if (key === '[' || key === ']') {
        const idx = LEVEL_IDS.indexOf(level.id) + (key === '[' ? -1 : 1);
        const target = LEVEL_IDS[idx];
        if (target && isDojoLevelUnlocked(LEVEL_IDS, idx, store.read())) selectLevel(target);
      } else if (op?.type === 'connected' && (key === 'y' || key === 'n')) {
        answerConnected(key === 'y');
      } else if (op?.type === 'union' && /^[1-9]$/.test(key)) {
        const idx = Number(key) - 1;
        if (idx < level.islands.length) pressIsland(idx);
        else handled = false;
      } else if (op?.type === 'edge' && (key === 'c' || key === 'u')) {
        answerEdge(key);
      } else {
        handled = false;
      }
      if (handled) setShowIntro(false);
      return handled;
    },
    [
      answerConnected,
      answerEdge,
      complete,
      level.id,
      level.islands.length,
      op,
      pressIsland,
      resetLevel,
      selectLevel,
    ],
  );

  const nextId = nextLevelId(level.id);
  const completedCount = dojoCompletedCount(LEVEL_IDS, progress);

  const value = useMemo<BridgeGameContextValue>(
    () => ({
      levelId,
      level,
      progress,
      dsu,
      bridges,
      opIndex,
      op,
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
      dsu,
      bridges,
      opIndex,
      op,
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

  return <BridgeGameContext.Provider value={value}>{children}</BridgeGameContext.Provider>;
}

export function useBridgeGame(): BridgeGameContextValue {
  const ctx = useContext(BridgeGameContext);
  if (!ctx) throw new Error('useBridgeGame must be used within BridgeGameProvider');
  return ctx;
}
