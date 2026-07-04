import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Award, Check, Flame, Trophy, X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { hapticError, hapticSuccess } from '@/lib/utils/haptic';
import { blockKind, BLOCK_META } from '@/lib/code';
import type { CodePiece } from '@/lib/code';
import type { AssembleGameProps, AssembleGameStatsStore } from './types';
import { commitBestMs, mergeGameStats, readBestMs } from './gameProgress';
import { createVelocityTracker, diffTokens, formatSecs, hashString, memoryStatsStore, mulberry32, mutateCode } from './gameShared';
import type { DiffToken } from './gameShared';
import {
  ConfettiBurst,
  GameBlock,
  GameHud,
  GameTimerRing,
  GhostSlot,
  HudChip,
  MagnifierSheet,
  usePrefersReducedMotion,
  WinCard,
} from './gameUi';

const GAME_ID = 'snap-call';
const FIRST_DEAL_MS = 8000;
const DEAL_MS = 5000;
const STREAK_MILESTONES = new Set([3, 5, 8, 12]);

type Phase = 'deal' | 'drag' | 'fly' | 'resolve' | 'won';
type DecoyKind = 'later' | 'mutant';

interface Deal {
  n: number;
  /** Synthetic piece carrying the shown code — drives team color + magnifier. */
  piece: CodePiece;
  shownCode: string;
  truthCode: string;
  isReal: boolean;
  decoyKind: DecoyKind | null;
  durMs: number;
}

interface WinSummary {
  ms: number;
  newBest: boolean;
  correct: number;
  misses: number;
  bestStreak: number;
}

function commitAuxStats(stats: AssembleGameStatsStore, bestStreak: number, perfect: boolean): void {
  const prev = stats.read<{ bestStreak?: number; perfect?: boolean }>(GAME_ID, {});
  mergeGameStats(stats, GAME_ID, {
    bestStreak: Math.max(prev.bestStreak ?? 0, bestStreak),
    perfect: (prev.perfect ?? false) || perfect,
  });
}

/** Regroup whitespace-diff tokens into per-line runs for hanging-indent rendering. */
function tokensToLines(tokens: DiffToken[]): DiffToken[][] {
  const lines: DiffToken[][] = [[]];
  for (const t of tokens) {
    const parts = t.text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ text: part, changed: t.changed });
    });
  }
  return lines;
}

function plainLines(code: string): DiffToken[][] {
  return code.split('\n').map((l) => (l ? [{ text: l, changed: false }] : []));
}

export function SnapCallGame({ pieces, storageKey, stats, onComplete, onContinue }: AssembleGameProps) {
  const reduced = usePrefersReducedMotion();
  const statsStore = useMemo(() => stats ?? memoryStatsStore(), [stats]);

  const [runId, setRunId] = useState(0);
  const [placedIdx, setPlacedIdx] = useState(0);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [phase, setPhase] = useState<Phase>('deal');
  const [streak, setStreak] = useState(0);
  const [misses, setMisses] = useState(0);
  const [remaining, setRemaining] = useState(FIRST_DEAL_MS / 1000);
  const [magnifier, setMagnifier] = useState(false);
  const magnifierRef = useRef(false);
  magnifierRef.current = magnifier;
  const [docHidden, setDocHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [caption, setCaption] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [slotFlash, setSlotFlash] = useState<'good' | 'bad' | null>(null);
  const [ghostCheck, setGhostCheck] = useState(0);
  const [wrongPulse, setWrongPulse] = useState(false);
  const [extinguish, setExtinguish] = useState(false);
  const [burst, setBurst] = useState(0);
  const [winStage, setWinStage] = useState<'none' | 'seam' | 'card'>('none');
  const [winStats, setWinStats] = useState<WinSummary | null>(null);
  const [bestMs, setBestMs] = useState<number | null>(() => readBestMs(statsStore, GAME_ID));
  const [ariaMsg, setAriaMsgRaw] = useState('');
  const ariaNonceRef = useRef(0);
  // repeated identical strings are not re-announced by aria-live — alternate a zero-width suffix
  const setAriaMsg = useCallback((msg: string) => {
    ariaNonceRef.current += 1;
    setAriaMsgRaw(msg + (ariaNonceRef.current % 2 ? '\u200b' : ''));
  }, []);

  // Latest-prop mirrors so every gesture/timer callback can stay referentially stable.
  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;
  const statsRef = useRef(statsStore);
  statsRef.current = statsStore;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const phaseRef = useRef<Phase>('deal');
  const dealRef = useRef<Deal | null>(null);
  const placedIdxRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const missesRef = useRef(0);
  const correctRef = useRef(0);
  const mutedRef = useRef<Set<number>>(new Set());
  const dealCounterRef = useRef(0);
  const sinceRealRef = useRef(0);
  const lastDecoyRef = useRef<string | null>(null);
  const mutantsShownRef = useRef<Set<string>>(new Set());
  const runSaltRef = useRef(0);
  const startedAtRef = useRef(0);
  const completedRef = useRef(false);

  const dealStartRef = useRef(0);
  const dealDurRef = useRef(FIRST_DEAL_MS);
  const pausedAccumRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const runPausedRef = useRef(0);
  const lastShownRemainRef = useRef(-1);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const stampNextRef = useRef<HTMLSpanElement | null>(null);
  const stampFakeRef = useRef<HTMLSpanElement | null>(null);
  const slotRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<{ id: number; x0: number; y0: number; moved: boolean } | null>(null);
  const velocityRef = useRef(createVelocityTracker());
  const longPressRef = useRef<number | null>(null);
  const timeoutsRef = useRef<Set<number>>(new Set());

  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, ms);
    timeoutsRef.current.add(id);
  }, []);

  const clearPending = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current.clear();
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressRef.current !== null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearPending();
      clearLongPress();
    },
    [clearPending, clearLongPress],
  );

  /* ------------------------------ deal engine ------------------------------ */

  const makeDeal = useCallback((): Deal => {
    const all = piecesRef.current;
    const placed = placedIdxRef.current;
    const n = dealCounterRef.current++;
    const rand = mulberry32((hashString(storageKeyRef.current) ^ Math.imul(n + 1, 0x9e3779b1) ^ runSaltRef.current) >>> 0);
    const truth = all[placed];
    const ahead = all.length - placed - 1;
    const durMs = n < 2 ? FIRST_DEAL_MS : DEAL_MS;

    // Progress never stalls beyond 3 deals: force real after 2 straight decoys.
    let isReal = sinceRealRef.current >= 2 || rand() < 0.55;
    let src = truth;
    let shown = truth.code;
    let kind: DecoyKind | null = null;

    if (!isReal) {
      const exclude = new Set<string>([...all.map((p) => p.code), ...mutantsShownRef.current]);
      const siblings = all.filter((_, i) => i !== placed).map((p) => p.code);
      const tryMutant = (): boolean => {
        for (let a = 0; a < 4; a++) {
          const m = mutateCode(truth.code, Math.floor(rand() * 0x7fffffff), exclude, siblings);
          if (m && m !== lastDecoyRef.current) {
            shown = m;
            src = truth;
            kind = 'mutant';
            mutantsShownRef.current.add(m);
            return true;
          }
        }
        return false;
      };
      const tryLater = (): boolean => {
        for (let a = 0; a < 4 && ahead >= 1; a++) {
          const j = placed + 1 + Math.floor(rand() * ahead);
          if (all[j].code !== lastDecoyRef.current) {
            shown = all[j].code;
            src = all[j];
            kind = 'later';
            return true;
          }
        }
        return false;
      };
      const made =
        ahead >= 2
          ? rand() < 0.6
            ? tryLater() || tryMutant()
            : tryMutant() || tryLater()
          : tryMutant() || tryLater();
      if (!made) {
        isReal = true;
        kind = null;
        src = truth;
        shown = truth.code;
      }
    }

    if (isReal) sinceRealRef.current = 0;
    else {
      sinceRealRef.current += 1;
      lastDecoyRef.current = shown;
    }

    return {
      n,
      piece: { id: `snap-${n}-${src.id}`, role: src.role, code: shown },
      shownCode: shown,
      truthCode: truth.code,
      isReal,
      decoyKind: kind,
      durMs,
    };
  }, []);

  const dealNext = useCallback(() => {
    const d = makeDeal();
    dealRef.current = d;
    setDeal(d);
    dealDurRef.current = d.durMs;
    dealStartRef.current = Date.now();
    pausedAccumRef.current = 0;
    if (pauseStartRef.current !== null) pauseStartRef.current = Date.now();
    lastShownRemainRef.current = -1;
    setRemaining(d.durMs / 1000);
    setShowDiff(false);
    setPhaseSync('deal');
  }, [makeDeal, setPhaseSync]);

  /* -------------------------------- win path -------------------------------- */

  const winRun = useCallback(() => {
    setPhaseSync('won');
    dealRef.current = null;
    setDeal(null);
    // Freeze the scored clock through pauses too (magnifier / hidden tab).
    const pausedNow = pauseStartRef.current !== null ? Date.now() - pauseStartRef.current : 0;
    const ms = Math.max(1, Date.now() - startedAtRef.current - runPausedRef.current - pausedNow);
    const perfect = missesRef.current === 0;
    const best = commitBestMs(statsRef.current, GAME_ID, ms);
    commitAuxStats(statsRef.current, bestStreakRef.current, perfect);
    setBestMs(best.bestMs);
    if (!completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current?.({ mistakes: missesRef.current, ms, perfect });
    }
    setWinStats({
      ms,
      newBest: best.newBest,
      correct: correctRef.current,
      misses: missesRef.current,
      bestStreak: bestStreakRef.current,
    });
    setWinStage('seam');
    setAriaMsg('Program complete');
    after(piecesRef.current.length * 40 + 560, () => setWinStage('card'));
  }, [after, setPhaseSync]);

  const placePiece = useCallback(
    (muted: boolean): boolean => {
      const idx = placedIdxRef.current;
      if (muted) mutedRef.current.add(idx);
      placedIdxRef.current = idx + 1;
      setPlacedIdx(idx + 1);
      setSlotFlash(muted ? 'bad' : 'good');
      after(280, () => setSlotFlash(null));
      if (idx + 1 >= piecesRef.current.length) {
        winRun();
        return true;
      }
      return false;
    },
    [after, winRun],
  );

  /* --------------------------- card motion helpers -------------------------- */

  const springBack = useCallback(() => {
    const el = cardRef.current;
    if (el) {
      el.style.transition = reducedRef.current
        ? 'transform 120ms ease-out'
        : 'transform 300ms cubic-bezier(0.2, 1.4, 0.4, 1)';
      el.style.transform = '';
    }
    for (const s of [stampNextRef.current, stampFakeRef.current]) {
      if (s) {
        s.style.transition = 'opacity 160ms ease-out';
        s.style.opacity = '0';
      }
    }
  }, []);

  const flyOff = useCallback((dir: 1 | -1, velocity: number): number => {
    const stamp = dir === 1 ? stampNextRef.current : stampFakeRef.current;
    if (stamp) {
      stamp.style.transition = 'none';
      stamp.style.opacity = '1';
    }
    const el = cardRef.current;
    if (!el) return 0;
    if (reducedRef.current) {
      el.style.transition = 'opacity 120ms ease-out';
      el.style.opacity = '0';
      return 130;
    }
    const dist = (el.offsetWidth || 320) + 120;
    const speed = Math.min(2, Math.max(0.7, Math.abs(velocity)));
    const dur = Math.max(120, Math.min(320, dist / speed));
    el.style.transition = `transform ${Math.round(dur)}ms ease-out, opacity 180ms ease-out`;
    el.style.transform = `translateX(${dir * dist}px) rotate(${dir * 22}deg)`;
    el.style.opacity = '0';
    return dur;
  }, []);

  /* -------------------------------- judgment -------------------------------- */

  const commit = useCallback(
    (dir: 1 | -1, velocity: number, viaTimeout = false) => {
      const d = dealRef.current;
      if (!d || (phaseRef.current !== 'deal' && phaseRef.current !== 'drag')) return;
      // Fairness: a later-piece decoy textually identical to the true next piece
      // is judged by code equality — accepting it is correct and places the truth.
      const real = d.isReal || d.shownCode === d.truthCode;
      const accepted = dir === 1;
      const isCorrect = !viaTimeout && accepted === real;
      setCaption(null);

      if (isCorrect) {
        correctRef.current += 1;
        const s = streakRef.current + 1;
        streakRef.current = s;
        setStreak(s);
        if (s > bestStreakRef.current) bestStreakRef.current = s;
        if (STREAK_MILESTONES.has(s)) {
          setBurst(s);
          after(1100, () => setBurst(0));
        }
        setPhaseSync('fly');
        const dur = flyOff(dir, velocity);
        if (accepted) {
          setAriaMsg(`Placed — ${s} streak`);
          after(dur, () => {
            hapticSuccess();
            if (!placePiece(false)) dealNext();
          });
        } else {
          setAriaMsg(`Fake dismissed — ${s} streak`);
          navigator.vibrate?.(12);
          setGhostCheck((g) => g + 1);
          after(Math.max(dur, 240), () => dealNext());
        }
        return;
      }

      missesRef.current += 1;
      setMisses(missesRef.current);
      if (streakRef.current > 0) {
        setExtinguish(true);
        after(460, () => setExtinguish(false));
      }
      streakRef.current = 0;
      setStreak(0);
      hapticError();
      setPhaseSync('resolve');
      springBack();
      setWrongPulse(true);
      after(320, () => setWrongPulse(false));

      if (real) {
        // Teach-why: the real line auto-places muted so the program never stalls.
        setAriaMsg(viaTimeout ? 'Time up — that was the real line' : 'Wrong — that was the real line');
        after(300, () => {
          setCaption('That was the real line');
          const won = placePiece(true);
          after(1200, () => setCaption(null));
          if (!won) after(520, () => dealNext());
        });
      } else if (d.decoyKind === 'mutant') {
        setAriaMsg(viaTimeout ? 'Time up — that line was a fake' : 'Wrong — spot the mutated tokens');
        setShowDiff(true);
        after(820, () => dealNext());
      } else {
        setAriaMsg('Wrong — that comes later');
        setCaption('Not yet — this comes later.');
        after(1000, () => dealNext());
        after(1300, () => setCaption(null));
      }
    },
    [after, dealNext, flyOff, placePiece, setPhaseSync, springBack],
  );

  const cancelDrag = useCallback(() => {
    const p = pointerRef.current;
    pointerRef.current = null;
    clearLongPress();
    if (p !== null && cardRef.current?.hasPointerCapture?.(p.id)) {
      try {
        cardRef.current.releasePointerCapture(p.id);
      } catch {
        /* already released */
      }
    }
    velocityRef.current.reset();
  }, [clearLongPress]);

  const handleTimeout = useCallback(() => {
    if (phaseRef.current !== 'deal' && phaseRef.current !== 'drag') return;
    if (pointerRef.current) cancelDrag();
    commit(-1, 0, true);
  }, [cancelDrag, commit]);

  const handleTimeoutRef = useRef(handleTimeout);
  handleTimeoutRef.current = handleTimeout;

  /* ---------------------------- clock + pausing ----------------------------- */

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!dealRef.current || (phaseRef.current !== 'deal' && phaseRef.current !== 'drag')) return;
      const now = Date.now();
      const anchor = pauseStartRef.current ?? now;
      const remainingMs = dealDurRef.current - (anchor - dealStartRef.current - pausedAccumRef.current);
      const shown = Math.max(0, remainingMs) / 1000;
      if (Math.abs(shown - lastShownRemainRef.current) >= 0.05) {
        lastShownRemainRef.current = shown;
        setRemaining(shown);
      }
      if (pauseStartRef.current === null && remainingMs <= 0) handleTimeoutRef.current();
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onVis = () => setDocHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const paused = magnifier || docHidden;
  useEffect(() => {
    const now = Date.now();
    if (paused) {
      if (pauseStartRef.current === null) pauseStartRef.current = now;
    } else if (pauseStartRef.current !== null) {
      pausedAccumRef.current += now - pauseStartRef.current;
      runPausedRef.current += now - pauseStartRef.current;
      pauseStartRef.current = null;
    }
  }, [paused]);

  /* ------------------------------- run control ------------------------------ */

  const startRun = useCallback(() => {
    clearPending();
    cancelDrag();
    dealCounterRef.current = 0;
    sinceRealRef.current = 0;
    lastDecoyRef.current = null;
    mutantsShownRef.current.clear();
    mutedRef.current = new Set();
    completedRef.current = false;
    runSaltRef.current = (Date.now() & 0xffffffff) >>> 0;
    placedIdxRef.current = 0;
    setPlacedIdx(0);
    streakRef.current = 0;
    bestStreakRef.current = 0;
    setStreak(0);
    missesRef.current = 0;
    correctRef.current = 0;
    setMisses(0);
    setCaption(null);
    setShowDiff(false);
    setSlotFlash(null);
    setGhostCheck(0);
    setWrongPulse(false);
    setExtinguish(false);
    setBurst(0);
    setWinStage('none');
    setWinStats(null);
    setMagnifier(false);
    setAriaMsg('');
    setBestMs(readBestMs(statsRef.current, GAME_ID));
    setRunId((r) => r + 1);
    startedAtRef.current = Date.now();
    runPausedRef.current = 0;
    dealNext();
  }, [cancelDrag, clearPending, dealNext]);

  const signature = useMemo(() => `${storageKey}::${pieces.map((p) => p.id).join('|')}`, [pieces, storageKey]);
  useEffect(() => {
    if (piecesRef.current.length === 0) return;
    startRun();
  }, [signature, startRun]);

  useEffect(() => {
    if (placedIdx === 0) return;
    slotRef.current?.scrollIntoView({ block: 'nearest', behavior: reducedRef.current ? 'auto' : 'smooth' });
  }, [placedIdx]);

  /* ----------------------------- pointer gestures --------------------------- */

  const onCardPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (magnifierRef.current) return;
      if (pointerRef.current !== null || phaseRef.current !== 'deal') return;
      const el = cardRef.current;
      if (!el) return;
      pointerRef.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false };
      velocityRef.current.reset();
      velocityRef.current.push(e.clientX, e.timeStamp);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture unsupported */
      }
      el.style.transition = 'none';
      clearLongPress();
      longPressRef.current = window.setTimeout(() => {
        longPressRef.current = null;
        const p = pointerRef.current;
        if (!p || p.moved) return;
        cancelDrag();
        springBack();
        setPhaseSync('deal');
        setMagnifier(true);
      }, 400);
      setPhaseSync('drag');
    },
    [cancelDrag, clearLongPress, setPhaseSync, springBack],
  );

  const onCardPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const p = pointerRef.current;
      if (!p || e.pointerId !== p.id || phaseRef.current !== 'drag') return;
      velocityRef.current.push(e.clientX, e.timeStamp);
      const dx = e.clientX - p.x0;
      const dy = e.clientY - p.y0;
      if (!p.moved && Math.hypot(dx, dy) >= 8) {
        p.moved = true;
        clearLongPress();
      }
      const el = cardRef.current;
      if (el) {
        const ty = Math.max(-12, Math.min(12, dy)) * 0.3;
        el.style.transform = `translateX(${dx}px) translateY(${ty}px) rotate(${dx * 0.06}deg)`;
      }
      const nextOn = Math.max(0, Math.min(1, (dx - 24) / 66));
      const fakeOn = Math.max(0, Math.min(1, (-dx - 24) / 66));
      if (stampNextRef.current) {
        stampNextRef.current.style.transition = 'none';
        stampNextRef.current.style.opacity = String(nextOn);
      }
      if (stampFakeRef.current) {
        stampFakeRef.current.style.transition = 'none';
        stampFakeRef.current.style.opacity = String(fakeOn);
      }
    },
    [clearLongPress],
  );

  const onCardPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const p = pointerRef.current;
      if (!p || e.pointerId !== p.id) return;
      velocityRef.current.push(e.clientX, e.timeStamp);
      const dx = e.clientX - p.x0;
      const v = velocityRef.current.velocity();
      cancelDrag();
      if (phaseRef.current !== 'drag') return;
      const width = cardRef.current?.offsetWidth || 320;
      if (dx > 0.35 * width || v > 0.5) commit(1, v);
      else if (dx < -0.35 * width || v < -0.5) commit(-1, v);
      else {
        setPhaseSync('deal');
        springBack();
      }
    },
    [cancelDrag, commit, setPhaseSync, springBack],
  );

  const onCardPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const p = pointerRef.current;
      if (!p || e.pointerId !== p.id) return;
      cancelDrag();
      if (phaseRef.current === 'drag') setPhaseSync('deal');
      springBack();
    },
    [cancelDrag, setPhaseSync, springBack],
  );

  const judgeByButton = useCallback(
    (dir: 1 | -1) => {
      if (magnifierRef.current || phaseRef.current !== 'deal') return;
      commit(dir, dir * 1.2);
    },
    [commit],
  );

  /* --------------------------------- render --------------------------------- */

  if (pieces.length === 0) {
    return <div className="rounded-md border border-edge bg-panel2 p-3 text-[13px] text-ink2">No puzzle pieces available.</div>;
  }

  const meta = deal ? BLOCK_META[blockKind(deal.piece)] : null;
  const clamped = deal ? deal.shownCode.split('\n').length > 6 : false;
  const codeLines: DiffToken[][] = deal
    ? showDiff && deal.decoyKind === 'mutant'
      ? tokensToLines(diffTokens(deal.truthCode, deal.shownCode).b)
      : plainLines(deal.shownCode)
    : [];
  const seamActive = winStage !== 'none';

  return (
    <div className="asm-snap relative flex h-full min-h-0 flex-col gap-1">
      <div aria-live="polite" role="status" className="sr-only">
        {ariaMsg}
      </div>

      <GameHud
        left={
          <>
            <HudChip tone="accent">
              {placedIdx}/{pieces.length}
            </HudChip>
            <span className="truncate text-[11px] text-ink3">placed</span>
          </>
        }
        center={
          <div className="relative inline-flex">
            <span
              key={`streak-${runId}-${streak}`}
              className={cn(
                'inline-flex min-w-[52px] items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-bold tabular-nums',
                streak > 0 ? 'asm-pop bg-accentbg text-accent' : 'bg-panel2 text-ink3',
                extinguish && 'snap-flame-out',
              )}
            >
              <Flame className={cn('h-3.5 w-3.5', streak === 0 && 'opacity-40')} aria-hidden />
              {streak}
              <span className="sr-only">streak</span>
            </span>
            {burst > 0 && (
              <div className="pointer-events-none absolute -left-8 -right-8 -top-2 h-24">
                <ConfettiBurst count={6} />
              </div>
            )}
          </div>
        }
        right={
          <>
            {misses > 0 && (
              <HudChip tone="bad">
                <X className="h-3 w-3" aria-hidden />
                {misses}
              </HudChip>
            )}
            <HudChip>
              <Trophy className="h-3 w-3" aria-hidden />
              {bestMs !== null ? formatSecs(bestMs) : '—'}
            </HudChip>
          </>
        }
      />

      {/* Work zone — the assembled program; keeps native vertical scroll. */}
      <div className="min-h-0 grow overflow-y-auto px-1 pb-2" style={{ flexBasis: '55%' }}>
        <div className="blk-board">
          {pieces.slice(0, placedIdx).map((p, i) => (
            <div
              key={p.id}
              className={cn('blk-row', seamActive && 'snap-seam')}
              style={seamActive ? ({ '--snap-seam-delay': `${i * 40}ms` } as CSSProperties) : undefined}
            >
              <GameBlock
                piece={p}
                muted={mutedRef.current.has(i)}
                flash={i === placedIdx - 1 ? slotFlash : null}
                className={i === placedIdx - 1 && slotFlash === 'good' ? 'asm-spring' : undefined}
              />
            </div>
          ))}
          {placedIdx < pieces.length && (
            <div ref={slotRef} className={cn(placedIdx > 0 && 'mt-1')}>
              <GhostSlot piece={pieces[placedIdx]} lines={pieces[placedIdx].code.split('\n').length} />
            </div>
          )}
        </div>
        {placedIdx === 0 && winStage === 'none' && (
          <p className="mt-2 px-2 text-center text-[11px] text-ink3">
            Is this the next line? Flick right for next, left for fake. Hold to inspect.
          </p>
        )}
      </div>

      {/* Action zone — candidate deck + judgment pills. */}
      <div data-noswipe className="relative flex shrink-0 flex-col px-1 pb-2" style={{ maxHeight: '45%' }}>
        <div className="flex h-5 shrink-0 items-center justify-center">
          {caption && <span className="snap-caption text-[12px] text-ink3">{caption}</span>}
        </div>
        <div className="relative mx-2 min-h-[132px]">
          <div
            aria-hidden
            className="absolute inset-0 z-0 rounded-[var(--radius)] border border-edge bg-panel2"
            style={{ transform: 'translateY(12px) scale(0.94)' }}
          />
          <div
            aria-hidden
            className="absolute inset-0 z-[1] rounded-[var(--radius)] border border-edge bg-panel2"
            style={{ transform: 'translateY(6px) scale(0.97)' }}
          />
          {ghostCheck > 0 && (
            <span
              key={ghostCheck}
              aria-hidden
              className="snap-ghost absolute -left-1 top-1/2 z-20 text-[32px] font-bold leading-none text-good"
            >
              ✓
            </span>
          )}
          {deal && meta && (
            <div
              ref={cardRef}
              key={`${runId}-${deal.n}`}
              className={cn(
                'snap-card snap-deal-in relative z-10 min-h-[120px] rounded-[var(--radius)] border border-edge bg-panel2 shadow-[var(--shadow-lg)]',
                wrongPulse && 'asm-shake snap-wrong',
              )}
              style={{ borderLeft: `4px solid ${meta.stroke}`, maxHeight: '40vh' }}
              data-noswipe
              onPointerDown={onCardPointerDown}
              onPointerMove={onCardPointerMove}
              onPointerUp={onCardPointerUp}
              onPointerCancel={onCardPointerCancel}
            >
              <div className="flex items-start gap-2.5 overflow-hidden p-3 pr-10" style={{ maxHeight: '40vh' }}>
                <span className="shrink-0 font-mono text-[28px] leading-none" style={{ color: meta.text }} aria-hidden>
                  {meta.glyph}
                </span>
                <div className={cn('min-w-0 flex-1 font-mono text-[12px] leading-[1.55] text-ink', clamped && 'snap-fade')}>
                  {codeLines.map((line, i) => (
                    <div key={i} className="snap-line">
                      {line.length === 0
                        ? ' '
                        : line.map((t, j) =>
                            t.changed ? (
                              <mark
                                key={j}
                                className="bg-transparent font-semibold text-bad underline decoration-2 underline-offset-2"
                              >
                                {t.text}
                              </mark>
                            ) : (
                              <span key={j}>{t.text}</span>
                            ),
                          )}
                    </div>
                  ))}
                </div>
              </div>
              <span className="absolute right-1.5 top-1.5 z-10">
                <GameTimerRing remaining={remaining} total={deal.durMs / 1000} paused={paused} />
              </span>
              <button
                type="button"
                aria-label="Inspect full code"
                className="absolute bottom-0 right-0 z-10 grid h-11 w-11 place-items-center text-ink3 hover:text-ink"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setMagnifier(true)}
              >
                <ZoomIn className="h-4 w-4" aria-hidden />
              </button>
              <span
                ref={stampNextRef}
                className="pointer-events-none absolute right-3 top-1/2 z-20 -translate-y-1/2 rotate-6 rounded-md border-2 border-good bg-goodbg px-2 py-0.5 text-[14px] font-extrabold tracking-widest text-good"
                style={{ opacity: 0 }}
              >
                ✓ NEXT
              </span>
              <span
                ref={stampFakeRef}
                className="pointer-events-none absolute left-3 top-1/2 z-20 -translate-y-1/2 -rotate-6 rounded-md border-2 border-bad bg-badbg px-2 py-0.5 text-[14px] font-extrabold tracking-widest text-bad"
                style={{ opacity: 0 }}
              >
                ✗ FAKE
              </span>
            </div>
          )}
        </div>
        <div className="mt-2.5 grid shrink-0 grid-cols-2 gap-2 px-2" data-snap-actions>
          <button
            type="button"
            disabled={!deal || phase !== 'deal'}
            onClick={() => judgeByButton(-1)}
            className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full bg-badbg px-4 text-[14px] font-semibold text-bad disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden />
            Fake
          </button>
          <button
            type="button"
            disabled={!deal || phase !== 'deal'}
            onClick={() => judgeByButton(1)}
            className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full bg-goodbg px-4 text-[14px] font-semibold text-good disabled:opacity-40"
          >
            <Check className="h-4 w-4" aria-hidden />
            Next
          </button>
        </div>
      </div>

      {magnifier && deal && <MagnifierSheet piece={deal.piece} onClose={() => setMagnifier(false)} />}

      {winStage === 'card' && winStats && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-bg/70 p-4" data-noswipe>
          <WinCard
            title="Program assembled"
            stats={[
              { label: 'Time', value: formatSecs(winStats.ms) },
              { label: 'Best streak', value: String(winStats.bestStreak) },
              {
                label: 'Accuracy',
                value: `${Math.round((winStats.correct / Math.max(1, winStats.correct + winStats.misses)) * 100)}%`,
              },
            ]}
            badges={[{ icon: Award, label: 'Perfect Call', earned: winStats.misses === 0 }]}
            newBest={winStats.newBest}
            primaryLabel={bestMs !== null ? `Play again — beat ${formatSecs(bestMs)}` : 'Play again'}
            onPrimary={startRun}
            secondaryLabel={onContinue ? 'Continue' : undefined}
            onSecondary={onContinue}
          />
        </div>
      )}
    </div>
  );
}
