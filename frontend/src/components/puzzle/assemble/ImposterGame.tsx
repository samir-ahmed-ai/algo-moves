import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Check, Eye, Heart, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { hapticError, hapticSuccess } from '@/lib/utils/haptic';
import { blockKind, BLOCK_META, type CodePiece } from '@/lib/code';
import type { AssembleGameProps, AssembleGameStatsStore } from './types';
import {
  diffTokens,
  hashString,
  memoryStatsStore,
  mulberry32,
  mutateCode,
  seededShuffle,
  type DiffToken,
} from './gameShared';
import {
  ConfettiBurst,
  GameBlock,
  GameHud,
  GameTimerRing,
  MagnifierSheet,
  usePrefersReducedMotion,
  WinCard,
} from './gameUi';

const GAME_ID = 'imposter';
const HEARTS = 3;
const MAX_ROUNDS = 5;
const ROUND_SECONDS = 45;
const IDLE_SPOTLIGHT_MS = 60_000;
const TAP_MAX_MS = 350;
const TAP_MAX_MOVE = 8;

/* ------------------------------ persistence ------------------------------- */
/* Score-based best blob, stored via the shared per-game stats facade. */

interface ImposterPersist {
  bestScore: number;
  sharpEyes: boolean;
}

function readImposterStats(stats: AssembleGameStatsStore): ImposterPersist {
  const v = stats.read<Partial<ImposterPersist>>(GAME_ID, {});
  return {
    bestScore: typeof v.bestScore === 'number' && Number.isFinite(v.bestScore) ? v.bestScore : 0,
    sharpEyes: v.sharpEyes === true,
  };
}

function writeImposterStats(stats: AssembleGameStatsStore, value: ImposterPersist): void {
  stats.write(GAME_ID, value);
}

/* -------------------------------- run plan -------------------------------- */

interface PlanRound {
  pieceIdx: number;
  mutant: string;
  originalFirst: boolean;
}

/** Deterministic per storageKey: round r draws from mulberry32(hash(storageKey) ^ r).
 *  Fresh pieces are preferred; already-used ones are retried (with a new mutant,
 *  guaranteed by the exclude set) only once every fresh candidate fails. */
function buildRunPlan(pieces: CodePiece[], storageKey: string): PlanRound[] {
  const eligible = pieces
    .map((_, i) => i)
    .filter((i) => blockKind(pieces[i]) !== 'close' && pieces[i].code.trim().length >= 8);
  const exclude = new Set(pieces.map((p) => p.code));
  const used = new Set<number>();
  const rounds: PlanRound[] = [];
  for (let r = 1; r <= MAX_ROUNDS && eligible.length > 0; r++) {
    const rand = mulberry32(hashString(storageKey) ^ r);
    const fresh = eligible.filter((i) => !used.has(i));
    const consumed = eligible.filter((i) => used.has(i));
    const order = [...seededShuffle(fresh, rand), ...seededShuffle(consumed, rand)];
    let made: PlanRound | null = null;
    for (const pieceIdx of order) {
      const seed = Math.floor(rand() * 4294967296);
      const siblings = pieces.filter((_, j) => j !== pieceIdx).map((p) => p.code);
      const mutant = mutateCode(pieces[pieceIdx].code, seed, exclude, siblings);
      if (mutant) {
        made = { pieceIdx, mutant, originalFirst: rand() < 0.5 };
        break;
      }
    }
    if (!made) break;
    exclude.add(made.mutant);
    used.add(made.pieceIdx);
    rounds.push(made);
  }
  return rounds;
}

function roundScore(wrongAccuses: number, fixMissed: boolean, bonus: number): number {
  let base = Math.max(0, 100 - 25 * wrongAccuses);
  if (fixMissed) base = Math.floor(base / 2);
  return base + (fixMissed ? 0 : bonus);
}

/* -------------------------------- component ------------------------------- */

interface RoundOutcome {
  score: number;
  firstTry: boolean;
}

interface EndSummary {
  total: number;
  firstTryCount: number;
  best: number;
  newBest: boolean;
  sharp: boolean;
}

type Phase = 'scan' | 'fix' | 'settle';
type FixState = 'open' | 'good' | 'wrong';
type EndKind = 'win' | 'dead' | null;

interface TapProbe {
  pid: number;
  idx: number;
  x: number;
  y: number;
  t: number;
  moved: number;
}

export function ImposterGame({
  pieces,
  storageKey,
  stats,
  onComplete,
  onContinue,
}: AssembleGameProps) {
  const statsStore = useMemo(() => stats ?? memoryStatsStore(), [stats]);
  const statsRef = useRef(statsStore);
  statsRef.current = statsStore;
  const plan = useMemo(() => buildRunPlan(pieces, storageKey), [pieces, storageKey]);
  const roundTotal = plan.length;
  const reducedMotion = usePrefersReducedMotion();

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('scan');
  const [hearts, setHearts] = useState(HEARTS);
  const [healed, setHealed] = useState(false);
  const [healedFlash, setHealedFlash] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const [heartPop, setHeartPop] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [spotlight, setSpotlight] = useState(false);
  const [magnifierIdx, setMagnifierIdx] = useState<number | null>(null);
  const [fixState, setFixState] = useState<FixState>('open');
  const [end, setEnd] = useState<EndKind>(null);
  const [showEndCard, setShowEndCard] = useState(false);
  const [summary, setSummary] = useState<EndSummary | null>(null);
  const [announce, setAnnounce] = useState('');
  const [accuseNonce, setAccuseNonce] = useState(0);
  const [runNonce, setRunNonce] = useState(0);
  const [hidden, setHidden] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  );

  const heartsRef = useRef(HEARTS);
  const mistakesRef = useRef(0);
  const outcomesRef = useRef<RoundOutcome[]>([]);
  const wrongRef = useRef(0);
  const bonusRef = useRef(0);
  const runStartRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const mountRef = useRef(Date.now());
  const tapRef = useRef<TapProbe | null>(null);
  const timersRef = useRef<Set<number>>(new Set());

  const later = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current.clear();
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const current = plan[round] ?? null;
  const mutantIdx = current?.pieceIdx ?? -1;
  const mutantPiece = useMemo<CodePiece | null>(
    () => (current ? { ...pieces[current.pieceIdx], code: current.mutant } : null),
    [current, pieces],
  );

  /** The block as rendered — the mutant while the lie is still standing. */
  const displayPieceAt = useCallback(
    (i: number): CodePiece => (i === mutantIdx && !healed && mutantPiece ? mutantPiece : pieces[i]),
    [mutantIdx, healed, mutantPiece, pieces],
  );

  /* degenerate content: nothing mutable at all — the lesson still completes */
  useEffect(() => {
    if (roundTotal === 0 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.({ mistakes: 0, ms: 0, perfect: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundTotal]);

  /* 45s soft ring — feeds the speed bonus only, never blocks play */
  const timerPaused =
    phase !== 'scan' || revealing || magnifierIdx !== null || hidden || end !== null;
  useEffect(() => {
    if (timerPaused || roundTotal === 0) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => (t > 0 ? Math.max(0, t - 0.25) : 0));
    }, 250);
    return () => window.clearInterval(id);
  }, [timerPaused, roundTotal, round, runNonce]);

  /* momentum keeper: 60s without an accusation soft-spotlights the liar's area */
  useEffect(() => {
    if (phase !== 'scan' || end || revealing || roundTotal === 0) return;
    const id = window.setTimeout(() => {
      setSpotlight(true);
      setAnnounce('Getting warmer — focus on the brighter blocks');
    }, IDLE_SPOTLIGHT_MS);
    return () => window.clearTimeout(id);
  }, [phase, end, revealing, round, accuseNonce, runNonce, roundTotal]);

  const loseHeart = useCallback((): number => {
    heartsRef.current = Math.max(0, heartsRef.current - 1);
    setHearts(heartsRef.current);
    setHeartPop((n) => n + 1);
    return heartsRef.current;
  }, []);

  const healBlock = useCallback(() => {
    setHealed(true);
    setHealedFlash(true);
    later(450, () => setHealedFlash(false));
  }, [later]);

  const finishRun = useCallback(
    (kind: 'win' | 'dead') => {
      const outcomes = outcomesRef.current;
      const total = outcomes.reduce((s, o) => s + o.score, 0);
      const firstTryCount = outcomes.filter((o) => o.firstTry).length;
      const sharp = kind === 'win' && roundTotal > 0 && firstTryCount === roundTotal;
      const prev = readImposterStats(statsRef.current);
      const prevBest = prev?.bestScore ?? 0;
      const best = Math.max(prevBest, total);
      writeImposterStats(statsRef.current, {
        bestScore: best,
        sharpEyes: (prev?.sharpEyes ?? false) || sharp,
      });
      setSummary({ total, firstTryCount, best, newBest: total > 0 && total > prevBest, sharp });
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.({
          mistakes: mistakesRef.current,
          ms: Date.now() - (runStartRef.current ?? mountRef.current),
          perfect: heartsRef.current === HEARTS,
        });
      }
      setEnd(kind);
      setAnnounce(kind === 'win' ? `Run complete — score ${total}` : `Run over — score ${total}`);
      later(kind === 'win' ? (reducedMotion ? 350 : 950) : 400, () => setShowEndCard(true));
    },
    [later, onComplete, reducedMotion, roundTotal, storageKey],
  );

  const advanceOrWin = useCallback(() => {
    if (round + 1 >= roundTotal) {
      finishRun('win');
      return;
    }
    wrongRef.current = 0;
    bonusRef.current = 0;
    setRound(round + 1);
    setPhase('scan');
    setHealed(false);
    setRevealing(false);
    setSpotlight(false);
    setShakeIdx(null);
    setFixState('open');
    setTimeLeft(ROUND_SECONDS);
    setAnnounce(`Round ${round + 2} of ${roundTotal}`);
  }, [round, roundTotal, finishRun]);

  /* hearts hit 0 during scan: reveal the liar and fix it so the lesson lands */
  const beginDeathReveal = useCallback(() => {
    setRevealing(true);
    later(700, () => {
      setPhase('settle');
      healBlock();
      outcomesRef.current = [...outcomesRef.current, { score: 0, firstTry: false }];
      later(700, () => finishRun('dead'));
    });
  }, [finishRun, healBlock, later]);

  const accuse = useCallback(
    (i: number) => {
      if (phase !== 'scan' || end || healed || revealing || !current) return;
      if (runStartRef.current === null) runStartRef.current = Date.now();
      setAccuseNonce((n) => n + 1);
      if (i === mutantIdx) {
        bonusRef.current = 2 * Math.ceil(Math.max(0, timeLeft));
        navigator.vibrate?.(12);
        setPhase('fix');
        setFixState('open');
        setAnnounce('Found it — choose the correct version');
      } else {
        hapticError();
        mistakesRef.current += 1;
        wrongRef.current += 1;
        setShakeIdx(i);
        later(400, () => setShakeIdx((s) => (s === i ? null : s)));
        const left = loseHeart();
        if (left <= 0) {
          setAnnounce(`Out of hearts — the imposter was block ${mutantIdx + 1}`);
          beginDeathReveal();
        } else {
          setAnnounce(`Not that one — ${left} heart${left === 1 ? '' : 's'} left`);
        }
      }
    },
    [
      phase,
      end,
      healed,
      revealing,
      current,
      mutantIdx,
      timeLeft,
      later,
      loseHeart,
      beginDeathReveal,
    ],
  );

  const pickFix = useCallback(
    (isOriginal: boolean) => {
      if (phase !== 'fix' || fixState !== 'open') return;
      if (isOriginal) {
        setFixState('good');
        later(190, () => {
          setPhase('settle');
          healBlock();
          hapticSuccess();
          outcomesRef.current = [
            ...outcomesRef.current,
            {
              score: roundScore(wrongRef.current, false, bonusRef.current),
              firstTry: wrongRef.current === 0,
            },
          ];
          setAnnounce('Fixed — the block is telling the truth again');
          later(520, advanceOrWin);
        });
      } else {
        hapticError();
        mistakesRef.current += 1;
        setFixState('wrong');
        const left = loseHeart();
        setAnnounce(
          left <= 0
            ? 'Not that version — out of hearts'
            : `Not that version — ${left} heart${left === 1 ? '' : 's'} left`,
        );
        later(900, () => {
          setPhase('settle');
          healBlock();
          outcomesRef.current = [
            ...outcomesRef.current,
            {
              score: roundScore(wrongRef.current, true, bonusRef.current),
              firstTry: wrongRef.current === 0,
            },
          ];
          if (left <= 0) later(600, () => finishRun('dead'));
          else later(520, advanceOrWin);
        });
      }
    },
    [phase, fixState, later, healBlock, advanceOrWin, loseHeart, finishRun],
  );

  const resetRun = useCallback(() => {
    clearTimers();
    heartsRef.current = HEARTS;
    mistakesRef.current = 0;
    outcomesRef.current = [];
    wrongRef.current = 0;
    bonusRef.current = 0;
    runStartRef.current = null;
    completedRef.current = false;
    tapRef.current = null;
    setHearts(HEARTS);
    setRound(0);
    setPhase('scan');
    setHealed(false);
    setHealedFlash(false);
    setRevealing(false);
    setShakeIdx(null);
    setHeartPop(0);
    setTimeLeft(ROUND_SECONDS);
    setSpotlight(false);
    setMagnifierIdx(null);
    setFixState('open');
    setEnd(null);
    setShowEndCard(false);
    setSummary(null);
    setAccuseNonce(0);
    setAnnounce(`New run — ${HEARTS} hearts, ${roundTotal} rounds`);
    setRunNonce((n) => n + 1);
  }, [clearTimers, roundTotal]);

  /* tap = pointerup with <8px total movement and <350ms — anything else was a scroll */
  const onBlockPointerDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>, idx: number) => {
    const tp = tapRef.current;
    // Only a genuinely-concurrent second finger is ignored; a stale probe (the
    // pointerup landed outside the board) or the same pointer restarting is replaced.
    if (tp && tp.pid !== e.pointerId && performance.now() - tp.t <= TAP_MAX_MS) return;
    tapRef.current = {
      pid: e.pointerId,
      idx,
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      moved: 0,
    };
  }, []);

  const onBlockPointerMove = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const tp = tapRef.current;
    if (!tp || tp.pid !== e.pointerId) return;
    tp.moved = Math.max(tp.moved, Math.hypot(e.clientX - tp.x, e.clientY - tp.y));
  }, []);

  const onBlockPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, idx: number) => {
      const tp = tapRef.current;
      if (!tp || tp.pid !== e.pointerId) return;
      tapRef.current = null;
      if (tp.idx === idx && tp.moved < TAP_MAX_MOVE && performance.now() - tp.t < TAP_MAX_MS)
        accuse(idx);
    },
    [accuse],
  );

  const onBlockPointerCancel = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    if (tapRef.current?.pid === e.pointerId) tapRef.current = null;
  }, []);

  const onBlockLostCapture = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    if (tapRef.current?.pid === e.pointerId) tapRef.current = null;
  }, []);

  const releaseTap = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (tapRef.current?.pid === e.pointerId) tapRef.current = null;
  }, []);

  const fixCards = useMemo(() => {
    if (!current) return null;
    const d = diffTokens(pieces[current.pieceIdx].code, current.mutant);
    const orig = { isOriginal: true, tokens: d.a };
    const mut = { isOriginal: false, tokens: d.b };
    return current.originalFirst ? [orig, mut] : [mut, orig];
  }, [current, pieces]);

  /* ------------------------------- degenerate ------------------------------ */

  if (roundTotal === 0) {
    return (
      <div className="relative flex h-full min-h-0 flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-[15px] font-semibold text-ink">Nothing to corrupt here</p>
        <p className="max-w-[260px] text-[12px] text-ink3">
          This solution is too small for an imposter to hide in. You get this one for free.
        </p>
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="mt-1 inline-flex min-h-[48px] items-center justify-center rounded-full bg-accent px-6 text-[14px] font-semibold text-white"
          >
            Continue
          </button>
        )}
      </div>
    );
  }

  /* --------------------------------- render -------------------------------- */

  const caption = end
    ? end === 'win'
      ? 'Every block is telling the truth.'
      : 'The imposter is patched — study the fix.'
    : phase === 'fix'
      ? 'Pick the true version.'
      : spotlight
        ? 'Getting warmer…'
        : 'One block is lying to you…';

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <GameHud
        left={
          <div
            className="flex items-center gap-1.5"
            role="img"
            aria-label={`Round ${Math.min(round + 1, roundTotal)} of ${roundTotal}`}
          >
            {plan.map((_, i) => {
              const done = i < round || (i === round && (healed || end === 'win'));
              const isCurrent = i === round && !done && !end;
              return (
                <span
                  key={i}
                  className={cn(
                    'h-2 w-2 rounded-full',
                    done ? 'bg-accent' : 'border border-edge bg-panel2',
                    isCurrent && 'imp-dot-current',
                    i === round && healed && 'imp-dot-flip',
                  )}
                />
              );
            })}
          </div>
        }
        center={
          <div
            className="flex items-center gap-1"
            role="img"
            aria-label={`${hearts} of ${HEARTS} hearts left`}
          >
            {Array.from({ length: HEARTS }, (_, i) => {
              const filled = i < hearts;
              const popping = i === hearts && heartPop > 0;
              return (
                <span key={i} className="relative grid h-5 w-5 place-items-center">
                  <Heart
                    className={cn('h-4 w-4 text-bad', !filled && 'opacity-30')}
                    fill={filled ? 'currentColor' : 'none'}
                  />
                  {popping && (
                    <Heart
                      key={`pop-${heartPop}`}
                      className="imp-heart-pop absolute h-4 w-4 text-bad"
                      fill="currentColor"
                      aria-hidden
                    />
                  )}
                </span>
              );
            })}
          </div>
        }
        right={<GameTimerRing remaining={timeLeft} total={ROUND_SECONDS} paused={timerPaused} />}
      />

      <div className="relative min-h-0 flex-1">
        <div
          className="ws-scroll h-full overflow-y-auto px-1 pb-8 pt-2"
          onPointerUp={releaseTap}
          onPointerCancel={releaseTap}
        >
          <div
            key={`${runNonce}:${round}`}
            className={cn('blk-board imp-board imp-round-in', end === 'win' && 'imp-win-cascade')}
          >
            {pieces.map((piece, i) => {
              const isMutantRow = i === mutantIdx;
              const lifted = isMutantRow && !healed && (phase === 'fix' || revealing);
              const dimmed = spotlight && phase === 'scan' && !end && Math.abs(i - mutantIdx) > 1;
              const kind = blockKind(piece);
              return (
                <div
                  key={piece.id}
                  className={cn('blk-row', dimmed && 'imp-dim', lifted && 'imp-row-lift')}
                  style={{ '--imp-seam-delay': `${i * 50}ms` } as CSSProperties}
                >
                  <button
                    type="button"
                    aria-label={`block ${i + 1} of ${pieces.length} — ${BLOCK_META[kind].label}`}
                    aria-disabled={phase !== 'scan' || !!end || revealing}
                    className={cn(
                      'block min-h-[44px] w-full text-left',
                      isMutantRow && healed && 'imp-heal',
                    )}
                    onPointerDown={(e) => onBlockPointerDown(e, i)}
                    onPointerMove={onBlockPointerMove}
                    onPointerUp={(e) => onBlockPointerUp(e, i)}
                    onPointerCancel={onBlockPointerCancel}
                    onLostPointerCapture={onBlockLostCapture}
                    onClick={(e) => {
                      if (e.detail === 0) accuse(i); // keyboard activation only — taps go through pointer probes
                    }}
                  >
                    <GameBlock
                      piece={displayPieceAt(i)}
                      flash={isMutantRow && healedFlash ? 'good' : shakeIdx === i ? 'bad' : null}
                      className={cn(
                        lifted && 'imp-lift',
                        shakeIdx === i && 'asm-shake',
                        isMutantRow && healed && 'asm-spring',
                        end === 'win' && 'asm-seam',
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label={`Inspect block ${i + 1} of ${pieces.length}`}
                    className="absolute right-0 top-0 z-10 grid h-11 w-11 place-items-center text-ink3"
                    onClick={() => setMagnifierIdx(i)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        {end === 'win' && !showEndCard && <ConfettiBurst count={18} />}
      </div>

      <div className="shrink-0 px-3 py-2 text-center text-[12px] text-ink3">{caption}</div>

      {phase === 'fix' && fixCards && (
        <div
          className="asm-sheet-in absolute inset-x-0 bottom-0 z-20 rounded-t-[var(--radius)] border-t border-edge bg-panel2 px-3 pb-4 pt-2 shadow-[var(--shadow-lg)]"
          role="dialog"
          aria-label="Choose the correct version"
          data-noswipe
        >
          <div className="imp-handle mx-auto mb-2" aria-hidden />
          <div className="mb-2 text-center text-[12px] font-medium text-ink2">
            Which version is the truth?
          </div>
          <div className="flex flex-col gap-2">
            {fixCards.map((card) => {
              const revealedGood = fixState !== 'open' && card.isOriginal;
              const missed = fixState === 'wrong' && !card.isOriginal;
              return (
                <button
                  key={card.isOriginal ? 'original' : 'mutant'}
                  type="button"
                  onClick={() => pickFix(card.isOriginal)}
                  className={cn(
                    'min-h-[64px] w-full rounded-[var(--radius)] border bg-panel p-3 text-left',
                    fixState === 'open' && 'border-edge',
                    revealedGood && 'border-good',
                    fixState === 'good' && card.isOriginal && 'asm-flash-good',
                    missed && 'border-bad asm-shake asm-flash-bad',
                  )}
                >
                  <div className="ws-scroll overflow-x-auto" data-noswipe>
                    <pre className="whitespace-pre font-mono text-[12px] leading-relaxed text-ink">
                      {card.tokens.map((t: DiffToken, ti: number) =>
                        t.changed ? (
                          <strong
                            key={ti}
                            className="font-bold text-ink underline decoration-2 underline-offset-2"
                          >
                            {t.text}
                          </strong>
                        ) : (
                          <span key={ti}>{t.text}</span>
                        ),
                      )}
                    </pre>
                  </div>
                  {revealedGood && (
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-good">
                      <Check className="h-3.5 w-3.5" />
                      correct version
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {magnifierIdx !== null && (
        <MagnifierSheet
          piece={displayPieceAt(magnifierIdx)}
          onClose={() => setMagnifierIdx(null)}
        />
      )}

      {showEndCard && summary && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-bg/70" aria-hidden />
          <WinCard
            title={end === 'win' ? 'Every imposter caught' : 'Run over'}
            stats={[
              { label: 'Score', value: String(summary.total) },
              { label: 'Hearts left', value: `${hearts}/${HEARTS}` },
              { label: 'First-try rounds', value: `${summary.firstTryCount}/${roundTotal}` },
            ]}
            badges={[{ icon: Eye, label: 'Sharp Eyes', earned: summary.sharp }]}
            newBest={summary.newBest}
            primaryLabel={end === 'win' ? `Play again — beat ${summary.best}` : 'Try again'}
            onPrimary={resetRun}
            secondaryLabel={onContinue ? 'Continue' : undefined}
            onSecondary={onContinue}
          />
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </div>
  );
}
