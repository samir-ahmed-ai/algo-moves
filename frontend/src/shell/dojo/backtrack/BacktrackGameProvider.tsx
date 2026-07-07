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
  activeRow,
  createState,
  getLevel,
  isComplete,
  isDeadEnd,
  nextLevelId,
  placeQueen,
  undoQueen,
  type QueensLevel,
  type QueensState,
} from './engine/queens';

export const BACKTRACK_GAME_ID = 'backtrack';

const store = getDojoProgressStore(BACKTRACK_GAME_ID);

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

export interface BacktrackGameContextValue {
  levelId: string;
  level: QueensLevel;
  progress: DojoProgress;
  state: QueensState;
  cursorCol: number;
  activeRow: number | null;
  actions: number;
  message: string | undefined;
  error: boolean;
  shake: boolean;
  complete: boolean;
  deadEnd: boolean;
  showIntro: boolean;
  showHint: boolean;
  nextId: string | null;
  completedCount: number;
  selectLevel: (id: string) => void;
  resetLevel: (keepHint?: boolean) => void;
  dismissIntro: () => void;
  handleKey: (key: string) => boolean;
}

const BacktrackGameContext = createContext<BacktrackGameContextValue | null>(null);

export function BacktrackGameProvider({ children }: { children: ReactNode }) {
  const [levelId, setLevelId] = useState(levelFromHash);
  const progress = store.use();
  const level = useMemo(() => getLevel(levelId) ?? LEVELS[0]!, [levelId]);

  const [state, setState] = useState<QueensState>(() => createState(level));
  const [cursorCol, setCursorCol] = useState(0);
  const [actions, setActions] = useState(0);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [complete, setComplete] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showHint, setShowHint] = useState(false);
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

  const resetLevel = useCallback(
    (keepHint = false) => {
      setState(createState(level));
      setCursorCol(0);
      setActions(0);
      setMessage(undefined);
      setError(false);
      setShake(false);
      setComplete(false);
      if (!keepHint) setShowHint(false);
    },
    [level],
  );

  const selectLevel = useCallback((id: string) => {
    if (!getLevel(id)) return;
    setLevelId(id);
    writeDojoHash({ gameId: BACKTRACK_GAME_ID, levelId: id });
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
      writeDojoHash({ gameId: BACKTRACK_GAME_ID, levelId }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const row = activeRow(state);
  const deadEnd = !complete && isDeadEnd(state);

  const moveCursor = useCallback(
    (delta: number) => {
      setCursorCol((c) => (((c + delta) % level.n) + level.n) % level.n);
      setMessage(undefined);
      setError(false);
    },
    [level.n],
  );

  const place = useCallback(() => {
    const result = placeQueen(state, cursorCol);
    if (!result.ok) {
      playDojoError();
      triggerShake();
      setError(true);
      if (result.reason === 'blocked') {
        setMessage('Cursed square — no queen may stand on ✕.');
      } else if (result.reason === 'attacked' && result.attacker) {
        const [qr, qc] = result.attacker;
        const via = qc === cursorCol ? 'column' : 'diagonal';
        setMessage(`Attacked — the queen on row ${qr + 1} sees this ${via}.`);
      }
      return;
    }
    playDojoTone(result.row);
    setState(result.state);
    setError(false);
    const spent = actions + 1;
    setActions(spent);
    if (isComplete(result.state)) {
      setComplete(true);
      setMessage(undefined);
      playDojoSuccess();
      store.markLevelComplete(level.id, spent, starsForMoves(spent, level.par));
    } else {
      setMessage(undefined);
    }
  }, [actions, cursorCol, level.id, level.par, state, triggerShake]);

  const undo = useCallback(() => {
    const result = undoQueen(state);
    if (!result.ok) {
      playDojoError();
      triggerShake();
      setError(true);
      setMessage(
        result.reason === 'prePlaced'
          ? 'Those queens belong to the court — only your own can be undone.'
          : 'Nothing to undo yet — place a queen first.',
      );
      return;
    }
    playDojoMelody([2, 0], 0.07);
    setState(result.state);
    setCursorCol(result.removed[1]);
    setActions((a) => a + 1);
    setError(false);
    setMessage(`Backtracked — row ${result.removed[0] + 1} is open again. Try the next column.`);
  }, [state, triggerShake]);

  const handleKey = useCallback(
    (key: string): boolean => {
      if (complete) {
        if (key === 'Enter') {
          const next = nextLevelId(level.id);
          if (next) selectLevel(next);
          return true;
        }
        if (key === 'r') {
          resetLevel();
          return true;
        }
        if (key === 'Escape') {
          resetLevel(true);
          return true;
        }
        return false;
      }

      let handled = true;
      switch (key) {
        case 'h':
        case 'ArrowLeft':
          moveCursor(-1);
          break;
        case 'l':
        case 'ArrowRight':
          moveCursor(1);
          break;
        case 'j':
        case 'Enter':
        case ' ':
          place();
          break;
        case 'u':
        case 'Backspace':
          undo();
          break;
        case 'r':
          resetLevel();
          break;
        case 'Escape':
          resetLevel(true);
          break;
        case '?':
          setShowHint((h) => !h);
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
    [complete, level.id, moveCursor, place, resetLevel, selectLevel, undo],
  );

  const nextId = nextLevelId(level.id);
  const completedCount = dojoCompletedCount(LEVEL_IDS, progress);

  const value = useMemo<BacktrackGameContextValue>(
    () => ({
      levelId,
      level,
      progress,
      state,
      cursorCol,
      activeRow: row,
      actions,
      message,
      error,
      shake,
      complete,
      deadEnd,
      showIntro,
      showHint,
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
      cursorCol,
      row,
      actions,
      message,
      error,
      shake,
      complete,
      deadEnd,
      showIntro,
      showHint,
      nextId,
      completedCount,
      selectLevel,
      resetLevel,
      dismissIntro,
      handleKey,
    ],
  );

  return <BacktrackGameContext.Provider value={value}>{children}</BacktrackGameContext.Provider>;
}

export function useBacktrackGame(): BacktrackGameContextValue {
  const ctx = useContext(BacktrackGameContext);
  if (!ctx) throw new Error('useBacktrackGame must be used within BacktrackGameProvider');
  return ctx;
}
