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
import { useWorkspace } from '@/store/workspace';
import {
  VIM_LEVELS,
  VIM_LEVEL_IDS,
  getVimLevel,
  nextLevelId,
  firstIncompleteLevelId,
  markLevelComplete,
  newMotionsForLevel,
  readVimProgress,
  parseVimHash,
  writeVimHash,
  createInputMachine,
  machineEcho,
  processKey,
  applyMotion,
  motionAllowed,
  type Pos,
  type InputMachine,
  type VimMotionKind,
  type VimProgress,
  type VimLevel,
  type MazeGrid,
} from '../engine';

function posKey([r, c]: Pos) {
  return `${r},${c}`;
}

function levelFromHash(): string {
  if (typeof location === 'undefined') return VIM_LEVEL_IDS[0]!;
  const parsed = parseVimHash(location.hash, location.pathname);
  if (parsed?.levelId && getVimLevel(parsed.levelId)) return parsed.levelId;
  return firstIncompleteLevelId(VIM_LEVEL_IDS, readVimProgress()) ?? VIM_LEVEL_IDS[0]!;
}

export interface VimGameContextValue {
  levelId: string;
  level: VimLevel;
  grid: MazeGrid;
  progress: VimProgress;
  cursor: Pos;
  visited: Set<string>;
  moves: number;
  echo: string;
  inputMachine: InputMachine;
  message: string | undefined;
  error: boolean;
  shake: boolean;
  complete: boolean;
  showHint: boolean;
  showIntro: boolean;
  newKeys: VimMotionKind[];
  nextId: string | null;
  completedCount: number;
  lastMotionOk: boolean;
  prevKey: string | null;
  currentKey: string | null;
  selectLevel: (id: string) => void;
  resetLevel: (keepHint?: boolean) => void;
  toggleHint: () => void;
  dismissIntro: () => void;
  recordKeyPress: (label: string) => void;
  handleKey: (key: string) => void;
  mazeFocusRef: React.MutableRefObject<HTMLDivElement | null>;
}

const VimGameContext = createContext<VimGameContextValue | null>(null);

export function VimGameProvider({ children }: { children: ReactNode }) {
  const { enterVim } = useWorkspace();
  const mazeFocusRef = useRef<HTMLDivElement | null>(null);

  const [levelId, setLevelId] = useState(levelFromHash);
  const [progress, setProgress] = useState<VimProgress>(() => readVimProgress());
  const level = useMemo(() => getVimLevel(levelId) ?? VIM_LEVELS[0]!, [levelId]);
  const grid = useMemo(() => level.grid.map((row) => row.replace(/@/g, '.')), [level]);

  const [cursor, setCursor] = useState<Pos>(() => [...level.start] as Pos);
  const [visited, setVisited] = useState<Set<string>>(() => new Set([posKey(level.start)]));
  const [moves, setMoves] = useState(0);
  const [echo, setEcho] = useState('');
  const [inputMachine, setInputMachine] = useState<InputMachine>(createInputMachine);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [complete, setComplete] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [lastMotionOk, setLastMotionOk] = useState(false);
  const [prevKey, setPrevKey] = useState<string | null>(null);
  const [currentKey, setCurrentKey] = useState<string | null>(null);

  const recordKeyPress = useCallback((label: string) => {
    setCurrentKey((current) => {
      setPrevKey(current);
      return label;
    });
  }, []);

  const resetLevel = useCallback(
    (keepHint = false) => {
      setCursor([...level.start] as Pos);
      setVisited(new Set([posKey(level.start)]));
      setMoves(0);
      setEcho('');
      setMessage(undefined);
      setError(false);
      setShake(false);
      setComplete(false);
      setLastMotionOk(false);
      setPrevKey(null);
      setCurrentKey(null);
      if (!keepHint) setShowHint(false);
      setInputMachine(createInputMachine());
    },
    [level],
  );

  const selectLevel = useCallback(
    (id: string) => {
      setLevelId(id);
      writeVimHash({ levelId: id });
      enterVim(id);
    },
    [enterVim],
  );

  const toggleHint = useCallback(() => setShowHint((h) => !h), []);
  const dismissIntro = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    resetLevel();
    setShowIntro(true);
  }, [levelId, resetLevel]);

  // Normalize corrupt or missing deep links to the resolved level.
  useEffect(() => {
    if (typeof location === 'undefined') return;
    const parsed = parseVimHash(location.hash, location.pathname);
    if (parsed && parsed.levelId !== levelId) {
      writeVimHash({ levelId }, { replace: true });
    }
  }, []);

  useEffect(() => {
    mazeFocusRef.current?.focus();
  }, [levelId]);

  const atGoal = cursor[0] === level.goal[0] && cursor[1] === level.goal[1];

  useEffect(() => {
    if (atGoal && !complete) {
      setComplete(true);
      setMessage('Complete!');
      setError(false);
      setProgress(markLevelComplete(level.id, moves));
    }
  }, [atGoal, complete, level.id, moves]);

  const handleKey = useCallback(
    (key: string) => {
      setShowIntro(false);

      if (complete) {
        if (key === 'Enter') {
          const next = nextLevelId(level.id);
          if (next) selectLevel(next);
          return;
        }
        if (key === 'r' || key === 'Escape') resetLevel();
        return;
      }

      if (key === 'Enter') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        setMessage('Use h j k l');
        setError(true);
        setLastMotionOk(false);
        return;
      }

      // 'gg' arrives as one composite key from the touch pad.
      const action =
        key === 'gg'
          ? processKey({ countStr: inputMachine.countStr, pending: 'g' }, 'g')
          : processKey(inputMachine, key);

      if (action.type === 'hint') {
        toggleHint();
        return;
      }

      if (action.type === 'reset') {
        resetLevel(true);
        setMessage('Reset');
        setError(false);
        return;
      }

      if (action.type === 'restart') {
        resetLevel();
        setMessage(undefined);
        setError(false);
        return;
      }

      if (action.type === 'partial') {
        setInputMachine(action.machine);
        setEcho(machineEcho(action.machine));
        return;
      }

      if (action.type === 'none') {
        if (inputMachine.pending || inputMachine.countStr) {
          setInputMachine(createInputMachine());
          setEcho('');
        }
        return;
      }

      if (action.type === 'motion') {
        setInputMachine(createInputMachine());

        if (!motionAllowed(action.motion.kind, level.allowed)) {
          setMessage(`${action.display} unlocks in a later level`);
          setError(true);
          setShake(true);
          setLastMotionOk(false);
          setTimeout(() => setShake(false), 300);
          return;
        }

        const next = applyMotion(grid, cursor, action.motion);
        if (!next) {
          setMessage('Blocked');
          setError(true);
          setShake(true);
          setLastMotionOk(false);
          setTimeout(() => setShake(false), 300);
          setEcho(action.display);
          return;
        }

        setCursor(next);
        setVisited((v) => new Set(v).add(posKey(next)));
        setMoves((m) => m + 1);
        setEcho(action.display);
        setMessage(undefined);
        setError(false);
        setLastMotionOk(true);
        setTimeout(() => setLastMotionOk(false), 400);
      }
    },
    [
      complete,
      cursor,
      grid,
      inputMachine,
      level.allowed,
      level.id,
      resetLevel,
      selectLevel,
      toggleHint,
    ],
  );

  const nextId = nextLevelId(level.id);
  const newKeys = useMemo(() => newMotionsForLevel(level), [level]);
  const completedCount = VIM_LEVEL_IDS.filter((id) => progress.levels[id]?.completed).length;

  const value = useMemo<VimGameContextValue>(
    () => ({
      levelId,
      level,
      grid,
      progress,
      cursor,
      visited,
      moves,
      echo: echo || machineEcho(inputMachine),
      inputMachine,
      message,
      error,
      shake,
      complete,
      showHint,
      showIntro,
      newKeys,
      nextId,
      completedCount,
      lastMotionOk,
      prevKey,
      currentKey,
      selectLevel,
      resetLevel,
      toggleHint,
      dismissIntro,
      recordKeyPress,
      handleKey,
      mazeFocusRef,
    }),
    [
      levelId,
      level,
      grid,
      progress,
      cursor,
      visited,
      moves,
      echo,
      inputMachine,
      message,
      error,
      shake,
      complete,
      showHint,
      showIntro,
      newKeys,
      nextId,
      completedCount,
      lastMotionOk,
      prevKey,
      currentKey,
      selectLevel,
      resetLevel,
      toggleHint,
      dismissIntro,
      recordKeyPress,
      handleKey,
    ],
  );

  return <VimGameContext.Provider value={value}>{children}</VimGameContext.Provider>;
}

export function useVimGame(): VimGameContextValue {
  const ctx = useContext(VimGameContext);
  if (!ctx) throw new Error('useVimGame must be used within VimGameProvider');
  return ctx;
}
