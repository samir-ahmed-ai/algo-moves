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
import { parseDojoHash, writeDojoHash } from '@/lib/navigation';
import { isEditableTarget } from '@/lib/utils/keyboard';
import {
  dojoCompletedCount,
  firstIncompleteDojoLevelId,
  getDojoProgressStore,
  isDojoLevelUnlocked,
  type DojoProgress,
} from '@/store/dojo/dojoProgress';
import {
  playDojoError,
  playDojoMelody,
  playDojoSuccess,
  playDojoTone,
} from '@/shell/dojo/lib/audio';
import { starsForMoves } from '@/shell/dojo/ui/shared';
import {
  LEVELS,
  LEVEL_IDS,
  getLevel,
  inDegrees,
  layerOf,
  nextLevelId,
  readyIndices,
  unmetPrereq,
  type TopoLevel,
} from './engine/graph';

export const TOPO_GAME_ID = 'toposort';

const store = getDojoProgressStore(TOPO_GAME_ID);

function initialLevelId(): string {
  if (typeof location === 'undefined') return LEVEL_IDS[0]!;
  const parsed = parseDojoHash(location.hash, location.pathname);
  const id = parsed?.levelId;
  if (id && getLevel(id) && isDojoLevelUnlocked(LEVEL_IDS, LEVEL_IDS.indexOf(id), store.read())) {
    return id;
  }
  return firstIncompleteDojoLevelId(LEVEL_IDS, store.read()) ?? LEVEL_IDS[0]!;
}

export interface TopoGameContextValue {
  levelId: string;
  level: TopoLevel;
  levelIndex: number;
  progress: DojoProgress;
  locked: number[];
  lockedSet: ReadonlySet<number>;
  ready: number[];
  readySet: ReadonlySet<number>;
  indegs: number[];
  layers: number[];
  mistakes: number;
  actions: number;
  message: string | undefined;
  error: boolean;
  shake: { idx: number; seq: number } | null;
  complete: boolean;
  calledCycle: boolean;
  stuck: boolean;
  showIntro: boolean;
  showHint: boolean;
  nextId: string | null;
  completedCount: number;
  selectLevel: (id: string) => void;
  resetLevel: (keepHint?: boolean) => void;
  toggleHint: () => void;
  dismissIntro: () => void;
  handleKey: (key: string) => boolean;
}

const TopoGameContext = createContext<TopoGameContextValue | null>(null);

export function TopoGameProvider({ children }: { children: ReactNode }) {
  const [levelId, setLevelId] = useState(initialLevelId);
  const progress = store.use();
  const level = useMemo(() => getLevel(levelId) ?? LEVELS[0]!, [levelId]);

  const [locked, setLocked] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState(false);
  const [shake, setShake] = useState<{ idx: number; seq: number } | null>(null);
  const [complete, setComplete] = useState(false);
  const [calledCycle, setCalledCycle] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const shakeSeqRef = useRef(0);

  const lockedSet = useMemo(() => new Set(locked), [locked]);
  const indegs = useMemo(() => inDegrees(level.nodes, level.edges, lockedSet), [level, lockedSet]);
  const ready = useMemo(
    () => readyIndices(level.nodes, level.edges, lockedSet),
    [level, lockedSet],
  );
  const readySet = useMemo(() => new Set(ready), [ready]);
  const layers = useMemo(() => layerOf(level.nodes, level.edges), [level]);

  const stuck = !complete && ready.length === 0 && locked.length < level.nodes.length;
  const actions = locked.length + mistakes + (calledCycle ? 1 : 0);
  const nextId = nextLevelId(level.id);
  const levelIndex = LEVEL_IDS.indexOf(level.id);
  const completedCount = dojoCompletedCount(LEVEL_IDS, progress);

  const resetLevel = useCallback((keepHint = false) => {
    setLocked([]);
    setMistakes(0);
    setMessage(undefined);
    setError(false);
    setShake(null);
    setComplete(false);
    setCalledCycle(false);
    if (!keepHint) setShowHint(false);
  }, []);

  const selectLevel = useCallback((id: string) => {
    if (!getLevel(id)) return;
    setLevelId(id);
    writeDojoHash({ gameId: TOPO_GAME_ID, levelId: id });
  }, []);

  const toggleHint = useCallback(() => setShowHint((h) => !h), []);
  const dismissIntro = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    resetLevel();
    setShowIntro(true);
  }, [levelId, resetLevel]);

  // Normalize missing or corrupt deep links to the resolved level.
  useEffect(() => {
    if (typeof location === 'undefined') return;
    const parsed = parseDojoHash(location.hash, location.pathname);
    if (parsed && parsed.levelId !== levelId) {
      writeDojoHash({ gameId: TOPO_GAME_ID, levelId }, { replace: true });
    }
  }, []);

  const failAction = useCallback((msg: string, idx: number | null) => {
    setMistakes((m) => m + 1);
    setMessage(msg);
    setError(true);
    playDojoError();
    if (idx != null) {
      shakeSeqRef.current += 1;
      const seq = shakeSeqRef.current;
      setShake({ idx, seq });
      window.setTimeout(() => {
        setShake((s) => (s && s.seq === seq ? null : s));
      }, 450);
    }
  }, []);

  const lock = useCallback(
    (idx: number) => {
      const next = [...locked, idx];
      setLocked(next);
      setMessage(undefined);
      setError(false);
      if (next.length === level.nodes.length) {
        const acts = next.length + mistakes;
        setComplete(true);
        playDojoMelody(next);
        store.markLevelComplete(level.id, acts, starsForMoves(acts, level.par));
      } else {
        playDojoTone(idx);
      }
    },
    [level, locked, mistakes],
  );

  const stepLevel = useCallback(
    (dir: -1 | 1) => {
      const target = LEVEL_IDS.indexOf(levelId) + dir;
      if (target < 0 || target >= LEVEL_IDS.length) return;
      if (!isDojoLevelUnlocked(LEVEL_IDS, target, store.read())) return;
      selectLevel(LEVEL_IDS[target]!);
    },
    [levelId, selectLevel],
  );

  const handleKey = useCallback(
    (key: string): boolean => {
      if (complete) {
        if (key === 'Enter') {
          if (nextId) selectLevel(nextId);
          return true;
        }
        if (key === 'r' || key === 'Escape') {
          resetLevel();
          return true;
        }
        return false;
      }

      let handled = false;

      if (key === '?') {
        toggleHint();
        handled = true;
      } else if (key === 'r') {
        resetLevel();
        handled = true;
      } else if (key === 'Escape') {
        resetLevel(true);
        handled = true;
      } else if (key === '[' || key === ']') {
        stepLevel(key === '[' ? -1 : 1);
        handled = true;
      } else if (key === 'c') {
        if (level.cyclic) {
          if (stuck) {
            const acts = locked.length + mistakes + 1;
            setCalledCycle(true);
            setComplete(true);
            setMessage(undefined);
            setError(false);
            playDojoSuccess();
            store.markLevelComplete(level.id, acts, starsForMoves(acts, level.par));
          } else {
            failAction('Something is still ready — keep going', null);
          }
          handled = true;
        }
      } else if (/^[1-9]$/.test(key)) {
        const idx = level.nodes.findIndex((n) => n.key === key);
        if (idx >= 0) {
          handled = true;
          if (lockedSet.has(idx)) {
            // already in the melody — no-op
          } else if (readySet.has(idx)) {
            lock(idx);
          } else {
            const prereq = unmetPrereq({ level, locked }, idx);
            const label = level.nodes[idx]!.label;
            failAction(
              prereq != null
                ? `«${label}» still needs «${level.nodes[prereq]!.label}»`
                : `«${label}» is not ready yet`,
              idx,
            );
          }
        }
      }

      if (handled && showIntro) setShowIntro(false);
      return handled;
    },
    [
      complete,
      nextId,
      selectLevel,
      resetLevel,
      toggleHint,
      stepLevel,
      level,
      stuck,
      locked,
      lockedSet,
      readySet,
      mistakes,
      lock,
      failAction,
      showIntro,
    ],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (handleKey(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKey]);

  const value = useMemo<TopoGameContextValue>(
    () => ({
      levelId,
      level,
      levelIndex,
      progress,
      locked,
      lockedSet,
      ready,
      readySet,
      indegs,
      layers,
      mistakes,
      actions,
      message,
      error,
      shake,
      complete,
      calledCycle,
      stuck,
      showIntro,
      showHint,
      nextId,
      completedCount,
      selectLevel,
      resetLevel,
      toggleHint,
      dismissIntro,
      handleKey,
    }),
    [
      levelId,
      level,
      levelIndex,
      progress,
      locked,
      lockedSet,
      ready,
      readySet,
      indegs,
      layers,
      mistakes,
      actions,
      message,
      error,
      shake,
      complete,
      calledCycle,
      stuck,
      showIntro,
      showHint,
      nextId,
      completedCount,
      selectLevel,
      resetLevel,
      toggleHint,
      dismissIntro,
      handleKey,
    ],
  );

  return <TopoGameContext.Provider value={value}>{children}</TopoGameContext.Provider>;
}

export function useTopoGame(): TopoGameContextValue {
  const ctx = useContext(TopoGameContext);
  if (!ctx) throw new Error('useTopoGame must be used within TopoGameProvider');
  return ctx;
}
