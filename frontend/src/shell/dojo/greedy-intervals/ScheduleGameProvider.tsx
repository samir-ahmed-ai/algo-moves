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
  LEVEL_IDS,
  LEVELS,
  bookValidity,
  earliestEndCandidates,
  formatTime,
  getLevel,
  nextLevelId,
  type ScheduleLevel,
} from './engine/schedule';

export const SCHEDULE_GAME_ID = 'greedy-intervals';

const store = getDojoProgressStore(SCHEDULE_GAME_ID);

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

export interface ScheduleGameContextValue {
  levelId: string;
  level: ScheduleLevel;
  progress: DojoProgress;
  booked: number[];
  hintIndices: number[];
  actions: number;
  message: string | undefined;
  error: boolean;
  shake: boolean;
  complete: boolean;
  hints: boolean;
  showIntro: boolean;
  nextId: string | null;
  completedCount: number;
  selectLevel: (id: string) => void;
  resetLevel: () => void;
  dismissIntro: () => void;
  handleKey: (key: string) => boolean;
}

const ScheduleGameContext = createContext<ScheduleGameContextValue | null>(null);

export function ScheduleGameProvider({ children }: { children: ReactNode }) {
  const [levelId, setLevelId] = useState(levelFromHash);
  const progress = store.use();
  const level = useMemo(() => getLevel(levelId) ?? LEVELS[0]!, [levelId]);

  const [booked, setBooked] = useState<number[]>([]);
  const [actions, setActions] = useState(0);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [complete, setComplete] = useState(false);
  const [hints, setHints] = useState(false);
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
    setBooked([]);
    setActions(0);
    setMessage(undefined);
    setError(false);
    setShake(false);
    setComplete(false);
  }, []);

  const selectLevel = useCallback((id: string) => {
    if (!getLevel(id)) return;
    setLevelId(id);
    writeDojoHash({ gameId: SCHEDULE_GAME_ID, levelId: id });
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
      writeDojoHash({ gameId: SCHEDULE_GAME_ID, levelId }, { replace: true });
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

  const bookMeeting = useCallback(
    (index: number) => {
      const meetings = level.meetings;
      const meeting = meetings[index];
      if (!meeting) return;
      const result = bookValidity(level, booked, index);
      if (!result.ok) {
        if (result.reason === 'alreadyBooked') {
          failAction(
            `${meeting.name} is already on your calendar — pick something that still fits.`,
          );
        } else if (result.reason === 'overlap') {
          const conflict = meetings[result.conflictIndex]!;
          failAction(
            `${meeting.name} (${formatTime(meeting.start)}–${formatTime(meeting.end)}) overlaps your ${formatTime(conflict.start)}–${formatTime(conflict.end)} booking (${conflict.name}).`,
          );
        } else {
          const better = meetings[result.betterIndex]!;
          failAction(
            `${meeting.name} ends ${formatTime(meeting.end)}; ${better.name} ends ${formatTime(better.end)} — finishing earlier leaves room for everything ${meeting.name} allows, and more.`,
          );
        }
        return;
      }
      const spent = actions + 1;
      setActions(spent);
      setBooked(result.booked);
      setError(false);
      playDojoTone(spent - 1);
      if (result.done) {
        setComplete(true);
        setMessage(
          `${result.booked.length} meetings booked and nothing compatible remains — that is the true maximum. You matched the optimum!`,
        );
        playDojoSuccess();
        store.markLevelComplete(level.id, spent, starsForMoves(spent, level.par));
      } else {
        setMessage(
          `Booked ${meeting.name} — it ends ${formatTime(meeting.end)}, the earliest finish among everything that fits.`,
        );
      }
    },
    [actions, booked, failAction, level],
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
      if (key >= '1' && key <= '9' && Number(key) <= level.meetings.length) {
        bookMeeting(Number(key) - 1);
      } else {
        switch (key) {
          case '?':
            setHints((h) => !h);
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
    [bookMeeting, complete, level.id, level.meetings.length, resetLevel, selectLevel],
  );

  const hintIndices = useMemo(
    () => (hints && !complete ? earliestEndCandidates(level, booked) : []),
    [booked, complete, hints, level],
  );

  const nextId = nextLevelId(level.id);
  const completedCount = dojoCompletedCount(LEVEL_IDS, progress);

  const value = useMemo<ScheduleGameContextValue>(
    () => ({
      levelId,
      level,
      progress,
      booked,
      hintIndices,
      actions,
      message,
      error,
      shake,
      complete,
      hints,
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
      booked,
      hintIndices,
      actions,
      message,
      error,
      shake,
      complete,
      hints,
      showIntro,
      nextId,
      completedCount,
      selectLevel,
      resetLevel,
      dismissIntro,
      handleKey,
    ],
  );

  return <ScheduleGameContext.Provider value={value}>{children}</ScheduleGameContext.Provider>;
}

export function useScheduleGame(): ScheduleGameContextValue {
  const ctx = useContext(ScheduleGameContext);
  if (!ctx) throw new Error('useScheduleGame must be used within ScheduleGameProvider');
  return ctx;
}
