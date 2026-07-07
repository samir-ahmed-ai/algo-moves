import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ListOrdered, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { hapticError } from '@/lib/utils/haptic';
import { blockKind, BLOCK_META, type CodePiece } from '@/lib/code';
import { isBetterAssembleTime, type AssembleGameProps, type AssembleGameStatsStore } from './types';
import {
  formatSecs,
  hashString,
  memoryStatsStore,
  mulberry32,
  pieceFirstLine,
  seededShuffle,
} from './gameShared';
import {
  ConfettiBurst,
  GameBlock,
  GameHud,
  HudChip,
  WinCard,
  usePrefersReducedMotion,
} from './gameUi';

const GAME_ID = 'one-stroke';

type Tier = 1 | 2 | 3;

const TIERS: { id: Tier; name: string }[] = [
  { id: 1, name: 'Guided' },
  { id: 2, name: 'Faded' },
  { id: 3, name: 'Silhouette' },
];

/** Hit rects are inset per side (~12px dead corridors) so grazing a neighbour never unfairly shatters. */
const HIT_INSET = 6;

interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TrailFx {
  kind: 'shatter' | 'lift';
  points: string;
  /** Tiles unlighting in reverse cascade (shatter only). */
  tiles: string[];
}

interface WinInfo {
  ms: number;
  broken: number;
  perfect: boolean;
  newBest: boolean;
  unlockedTier: 2 | 3 | null;
  points: string;
  step: boolean;
}

interface StrokeSaved {
  bestT1?: number | null;
  bestT2?: number | null;
  bestT3?: number | null;
  bestSteps?: number | null;
  t2?: boolean;
  t3?: boolean;
}

/* One Stroke keeps per-tier bests + tier unlocks in one stats blob. */
function readStrokeStats(stats: AssembleGameStatsStore): StrokeSaved {
  return stats.read<StrokeSaved>(GAME_ID, {});
}

function writeStrokeStats(stats: AssembleGameStatsStore, value: StrokeSaved): void {
  stats.write(GAME_ID, value);
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;

const fmtClock = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

export function OneStrokeGame({
  pieces,
  storageKey,
  stats,
  onComplete,
  onContinue,
}: AssembleGameProps) {
  const statsStore = useMemo(() => stats ?? memoryStatsStore(), [stats]);
  const n = pieces.length;
  const cols = n <= 8 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const reducedMotion = usePrefersReducedMotion();

  /* Tile geography: seeded shuffle, stable per problem forever — never canonical. */
  const tiles = useMemo(() => {
    const shuffled = seededShuffle(pieces, mulberry32(hashString(storageKey)));
    if (shuffled.length > 1 && shuffled.every((p, i) => p.id === pieces[i]?.id)) {
      shuffled.push(shuffled.shift() as CodePiece);
    }
    return shuffled;
  }, [pieces, storageKey]);

  /* Same glyph AND same role → tiny disambiguating index chip (Guided only). */
  const dupIndex = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const p of pieces) {
      const key = `${BLOCK_META[blockKind(p)].glyph}|${p.role}`;
      const g = groups.get(key);
      if (g) g.push(p.id);
      else groups.set(key, [p.id]);
    }
    const out = new Map<string, number>();
    groups.forEach((ids) => {
      if (ids.length > 1) ids.forEach((id, i) => out.set(id, i + 1));
    });
    return out;
  }, [pieces]);

  const [tier, setTier] = useState<Tier>(1);
  const [stepMode, setStepMode] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'stroking' | 'won'>('idle');
  const [capturedTiles, setCapturedTiles] = useState<string[]>([]);
  const [fx, setFx] = useState<TrailFx | null>(null);
  const [winInfo, setWinInfo] = useState<WinInfo | null>(null);
  const [winStage, setWinStage] = useState<'pulse' | 'stack' | null>(null);
  const [announce, setAnnounceRaw] = useState('');
  const announceNonce = useRef(0);
  // aria-live ignores identical consecutive strings — alternate a zero-width suffix
  const setAnnounce = (msg: string) => {
    announceNonce.current += 1;
    setAnnounceRaw(msg + (announceNonce.current % 2 ? '\u200b' : ''));
  };
  const [, setRectsV] = useState(0);
  const [bests, setBests] = useState<Record<Tier | 'steps', number | null>>(() => {
    const s = readStrokeStats(statsStore);
    return { 1: num(s.bestT1), 2: num(s.bestT2), 3: num(s.bestT3), steps: num(s.bestSteps) };
  });
  const [unlocked, setUnlocked] = useState<{ 2: boolean; 3: boolean }>(() => {
    const s = readStrokeStats(statsStore);
    return { 2: s.t2 === true, 3: s.t3 === true };
  });

  const gridRef = useRef<HTMLDivElement | null>(null);
  const tileEls = useRef(new Map<string, HTMLDivElement>());
  const rects = useRef(new Map<string, TileRect>());
  const gridRect = useRef<DOMRect | null>(null);
  const runRef = useRef<{
    captured: string[];
    capturedTiles: string[];
    start: number;
    end: number | null;
  } | null>(null);
  const capturedSet = useRef(new Set<string>());
  const activePtr = useRef<number | null>(null);
  const livePt = useRef<{ x: number; y: number } | null>(null);
  const rafId = useRef(0);
  const brokenRef = useRef(0);
  const liftsRef = useRef(0);
  const clockEl = useRef<HTMLSpanElement | null>(null);
  const liveLineEl = useRef<SVGLineElement | null>(null);
  const haloEl = useRef<SVGPolylineElement | null>(null);
  const timeouts = useRef(new Set<number>());
  const stepModeRef = useRef(stepMode);
  stepModeRef.current = stepMode;
  const liftRef = useRef<() => void>(() => {});
  const resolveRunRef = useRef<() => void>(() => {});
  const loadedKey = useRef(storageKey);

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timeouts.current.delete(id);
      fn();
    }, ms);
    timeouts.current.add(id);
  };

  const clearTimers = () => {
    timeouts.current.forEach((id) => window.clearTimeout(id));
    timeouts.current.clear();
  };

  /* --------------------------- geometry & hit test -------------------------- */

  const rebuildRects = () => {
    const g = gridRef.current;
    if (!g) return;
    const gr = g.getBoundingClientRect();
    gridRect.current = gr;
    rects.current.clear();
    tileEls.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      rects.current.set(id, { x: r.left - gr.left, y: r.top - gr.top, w: r.width, h: r.height });
    });
    setRectsV((v) => v + 1); // trail geometry re-renders from fresh rects
  };
  const rebuildRef = useRef(rebuildRects);
  rebuildRef.current = rebuildRects;

  /* Initial build after layout — some renderers never fire ResizeObserver's
   * initial callback, so the observer alone can't be trusted for mount. */
  useLayoutEffect(() => {
    rebuildRef.current();
  }, [tiles, cols, rows]);

  const toLocal = (e: ReactPointerEvent) => {
    const gr = gridRect.current;
    return gr ? { x: e.clientX - gr.left, y: e.clientY - gr.top } : { x: 0, y: 0 };
  };

  const hitTile = (pt: { x: number; y: number }): CodePiece | null => {
    for (const p of tiles) {
      const r = rects.current.get(p.id);
      if (!r) continue;
      if (
        pt.x >= r.x + HIT_INSET &&
        pt.x <= r.x + r.w - HIT_INSET &&
        pt.y >= r.y + HIT_INSET &&
        pt.y <= r.y + r.h - HIT_INSET
      ) {
        return p;
      }
    }
    return null;
  };

  const centerOf = (id: string) => {
    const r = rects.current.get(id);
    return r ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : null;
  };

  const trailPoints = (tileIds: string[], extra?: { x: number; y: number } | null) => {
    const pts = tileIds.map(centerOf).filter((c): c is { x: number; y: number } => c !== null);
    if (extra) pts.push(extra);
    return pts.map((p) => `${p.x},${p.y}`).join(' ');
  };

  /* ----------------------- imperative feedback helpers ---------------------- */
  /* Fired synchronously inside the pointer event that detects the hit. */

  const flashTile = (id: string, cls: string) => {
    const el = tileEls.current.get(id);
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // restart the animation
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  };

  const setClock = (text: string) => {
    if (clockEl.current) clockEl.current.textContent = text;
  };

  /* --------------------------- stroke clock + trail ------------------------- */
  /* rAF runs only while stroking: centisecond clock + live segment + halo. */

  const tick = () => {
    const run = runRef.current;
    if (!run) return;
    const now = performance.now();
    setClock(fmtClock((run.end ?? now) - run.start));
    if (!stepModeRef.current) {
      const line = liveLineEl.current;
      const lastTileId = run.capturedTiles[run.capturedTiles.length - 1];
      const last = lastTileId ? centerOf(lastTileId) : null;
      const lp = livePt.current;
      if (line) {
        if (run.end === null && last && lp) {
          line.setAttribute('visibility', 'visible');
          line.setAttribute('x1', String(last.x));
          line.setAttribute('y1', String(last.y));
          line.setAttribute('x2', String(lp.x));
          line.setAttribute('y2', String(lp.y));
        } else {
          line.setAttribute('visibility', 'hidden');
        }
      }
      haloEl.current?.setAttribute(
        'points',
        trailPoints(run.capturedTiles, run.end === null ? lp : null),
      );
    }
    rafId.current = requestAnimationFrame(tick);
  };

  const startRaf = () => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(tick);
  };

  const endStroke = () => {
    if (activePtr.current !== null) {
      try {
        gridRef.current?.releasePointerCapture(activePtr.current);
      } catch {
        /* pointer already released */
      }
      activePtr.current = null;
    }
    cancelAnimationFrame(rafId.current);
    livePt.current = null;
    liveLineEl.current?.setAttribute('visibility', 'hidden');
    haloEl.current?.setAttribute('points', '');
  };

  const clearRun = () => {
    runRef.current = null;
    capturedSet.current.clear();
    setCapturedTiles([]);
  };

  /* ------------------------------ run outcomes ------------------------------ */

  const shatter = (offender: CodePiece) => {
    const run = runRef.current;
    if (!run) return;
    hapticError();
    brokenRef.current += 1;
    setFx({
      kind: 'shatter',
      points: trailPoints(run.capturedTiles, livePt.current),
      tiles: [...run.capturedTiles],
    });
    flashTile(offender.id, 'stroke-bad-pulse');
    const reached = run.captured.length;
    endStroke();
    clearRun();
    setPhase('idle');
    setClock('0.00s');
    setAnnounce(`Stroke broken at ${reached} of ${n}. Start again from the first piece.`);
    schedule(() => setFx(null), 700);
    schedule(() => {
      const firstPiece = pieces[0];
      const first = firstPiece ? tiles.find((t) => t.code === firstPiece.code) : undefined;
      if (first) flashTile(first.id, 'stroke-invite');
    }, 320);
  };

  const lift = () => {
    const run = runRef.current;
    if (!run) return;
    liftsRef.current += 1;
    setFx({ kind: 'lift', points: trailPoints(run.capturedTiles, livePt.current), tiles: [] });
    endStroke();
    clearRun();
    setPhase('idle');
    setClock('0.00s');
    setAnnounce('Stroke lifted. Start again from the first piece.');
    schedule(() => setFx(null), 550);
  };
  liftRef.current = lift;

  const win = () => {
    const run = runRef.current;
    if (!run) return;
    const ms = (run.end ?? performance.now()) - run.start;
    const broken = brokenRef.current;
    const perfect = broken === 0;
    const points = trailPoints(run.capturedTiles);
    const step = stepModeRef.current;
    endStroke();
    runRef.current = null;
    setPhase('won');
    setClock(fmtClock(ms));

    const secs = ms / 1000;
    let newBest = false;
    const b = { ...bests };
    if (step) {
      if (isBetterAssembleTime(secs, b.steps)) {
        b.steps = secs;
        newBest = true;
      }
    } else if (isBetterAssembleTime(secs, b[tier])) {
      b[tier] = secs;
      newBest = true;
    }
    let unlockedTier: 2 | 3 | null = null;
    const u = { ...unlocked };
    if (perfect && tier === 1 && !u[2]) {
      u[2] = true;
      unlockedTier = 2;
    } else if (perfect && tier === 2 && !u[3]) {
      u[3] = true;
      unlockedTier = 3;
    }
    setBests(b);
    setUnlocked(u);
    writeStrokeStats(statsStore, {
      bestT1: b[1],
      bestT2: b[2],
      bestT3: b[3],
      bestSteps: b.steps,
      t2: u[2],
      t3: u[3],
    });
    onComplete?.({ mistakes: broken, ms, perfect });

    setWinInfo({ ms, broken, perfect, newBest, unlockedTier, points, step });
    if (reducedMotion) {
      setWinStage('stack');
    } else {
      setWinStage('pulse');
      schedule(() => setWinStage('stack'), 340);
    }
    setAnnounce(`Traced all ${n} pieces in ${fmtClock(ms)}${perfect ? ', flawless' : ''}.`);
  };

  const resetRun = (nextTier?: Tier, nextStep?: boolean) => {
    clearTimers();
    endStroke();
    clearRun();
    brokenRef.current = 0; // flawless counter resets on tier switch and on win
    liftsRef.current = 0;
    setFx(null);
    setWinInfo(null);
    setWinStage(null);
    setPhase('idle');
    setClock('0.00s');
    if (nextTier !== undefined) setTier(nextTier);
    if (nextStep !== undefined) setStepMode(nextStep);
  };

  /* ------------------------------ pointer flow ------------------------------ */

  const captureHit = (hit: CodePiece) => {
    const run = runRef.current;
    if (!run) return;
    const expected = pieces[run.captured.length];
    if (!expected) return;
    /* Fairness on duplicates: capture by code equality — the expected id is
     * recorded, the entered tile lights, remaining slots stay reachable. */
    run.captured.push(expected.id);
    run.capturedTiles.push(hit.id);
    capturedSet.current.add(hit.id);
    setCapturedTiles([...run.capturedTiles]);
    flashTile(hit.id, 'asm-pop');
    navigator.vibrate?.(8);
    setAnnounce(`${run.captured.length} of ${n}`);
    if (run.captured.length === n) run.end = performance.now();
  };

  const stepTap = (hit: CodePiece) => {
    if (capturedSet.current.has(hit.id)) return;
    const count = runRef.current?.captured.length ?? 0;
    const expected = pieces[count];
    if (!expected) return;
    if (hit.code === expected.code) {
      if (!runRef.current) {
        runRef.current = { captured: [], capturedTiles: [], start: performance.now(), end: null };
        setFx(null);
        setPhase('stroking');
        startRaf();
      }
      captureHit(hit);
      if (runRef.current && runRef.current.captured.length === n) win();
    } else {
      // step mode: a wrong tap only shakes that tile — no full reset
      brokenRef.current += 1;
      flashTile(hit.id, 'asm-shake');
      hapticError();
      setAnnounce('Not that one yet.');
    }
  };

  resolveRunRef.current = () => {
    const run = runRef.current;
    if (!run) return;
    if (run.captured.length === n) win();
    else lift();
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (phase === 'won') return;
    if (activePtr.current !== null) return; // ignore extra simultaneous pointers
    if (rects.current.size === 0) rebuildRects();
    gridRect.current = gridRef.current?.getBoundingClientRect() ?? gridRect.current;
    const pt = toLocal(e);
    const hit = hitTile(pt);
    if (!hit) return; // gutter — nothing
    if (stepMode) {
      stepTap(hit);
      return;
    }
    if (runRef.current) return;
    const firstPiece = pieces[0];
    if (!firstPiece) return;
    if (hit.code === firstPiece.code) {
      try {
        gridRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort */
      }
      activePtr.current = e.pointerId;
      setFx(null);
      runRef.current = {
        captured: [firstPiece.id],
        capturedTiles: [hit.id],
        start: performance.now(),
        end: null,
      };
      capturedSet.current = new Set([hit.id]);
      setCapturedTiles([hit.id]);
      setPhase('stroking');
      flashTile(hit.id, 'asm-pop');
      navigator.vibrate?.(8);
      livePt.current = pt;
      startRaf();
      setAnnounce(`1 of ${n}`);
    } else {
      // free nose-poke to learn the first piece — not counted as broken
      flashTile(hit.id, 'asm-shake');
      hapticError();
      setAnnounce('Not the first piece.');
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (stepMode) return;
    if (activePtr.current !== e.pointerId) return;
    const run = runRef.current;
    if (!run) return;
    // Re-anchor per move — the card can translate mid-stroke (deck drag, scroll).
    gridRect.current = gridRef.current?.getBoundingClientRect() ?? gridRect.current;
    const pt = toLocal(e);
    livePt.current = pt; // live segment catches up on the next rAF
    if (run.captured.length >= n) return;
    const hit = hitTile(pt);
    if (!hit || capturedSet.current.has(hit.id)) return; // re-crossing your own path is safe
    const expected = pieces[run.captured.length];
    if (!expected) return;
    if (hit.code === expected.code) captureHit(hit);
    else shatter(hit);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePtr.current !== e.pointerId) return;
    const run = runRef.current;
    if (!run) {
      activePtr.current = null;
      return;
    }
    if (run.captured.length === n) win();
    else lift();
  };

  const onPointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePtr.current !== e.pointerId) return;
    const run = runRef.current;
    if (run) run.captured.length === n ? win() : lift();
    rebuildRects();
  };

  /* --------------------------------- effects -------------------------------- */

  useEffect(() => {
    const g = gridRef.current;
    if (!g) return;
    const onLayout = () => {
      if (runRef.current && !stepModeRef.current) resolveRunRef.current(); // rotation/resize mid-stroke
      rebuildRef.current();
    };
    const ro = new ResizeObserver(onLayout);
    ro.observe(g);
    window.addEventListener('orientationchange', onLayout);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', onLayout);
    };
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && runRef.current && !stepModeRef.current) resolveRunRef.current();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    const pending = timeouts.current;
    return () => {
      cancelAnimationFrame(rafId.current);
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (loadedKey.current === storageKey) return;
    loadedKey.current = storageKey;
    const s = readStrokeStats(statsStore);
    setBests({ 1: num(s.bestT1), 2: num(s.bestT2), 3: num(s.bestT3), steps: num(s.bestSteps) });
    setUnlocked({ 2: s.t2 === true, 3: s.t3 === true });
    resetRun(1, false);
  }, [storageKey]);

  /* --------------------------------- render --------------------------------- */

  if (n === 0) {
    return (
      <div className="rounded-md border border-edge bg-panel2 p-3 text-[13px] text-ink2">
        No puzzle pieces available.
      </div>
    );
  }

  const capturedCount = capturedTiles.length;
  const activeBest = stepMode ? bests.steps : bests[tier];
  const centers = capturedTiles
    .map(centerOf)
    .filter((c): c is { x: number; y: number } => c !== null);
  const segments = centers.slice(1).flatMap((c, i) => {
    const a = centers[i];
    const key = capturedTiles[i + 1];
    return a && key ? [{ a, b: c, key }] : [];
  });
  const tierMeta = TIERS[tier - 1];
  const unlockedTierMeta =
    winInfo?.unlockedTier != null ? TIERS[winInfo.unlockedTier - 1] : undefined;
  const winSecondary =
    winInfo?.unlockedTier != null
      ? {
          secondaryLabel: `Try ${unlockedTierMeta?.name ?? 'next tier'}`,
          onSecondary: () => resetRun(winInfo.unlockedTier as Tier),
        }
      : onContinue
        ? { secondaryLabel: 'Continue', onSecondary: onContinue }
        : {};

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <GameHud
        left={
          <div
            className="relative flex h-7 min-w-[64px] items-center overflow-hidden rounded-full bg-panel2 px-2.5"
            role="img"
            aria-label={`${capturedCount} of ${n} captured`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-accent opacity-25 transition-[width] duration-150"
              style={{ width: `${(capturedCount / n) * 100}%` }}
              aria-hidden
            />
            <span className="relative text-[11px] font-semibold tabular-nums text-ink">
              {capturedCount}/{n}
            </span>
          </div>
        }
        center={
          <span ref={clockEl} className="text-[13px] font-semibold tabular-nums text-ink2">
            0.00s
          </span>
        }
        right={
          <>
            <HudChip>{activeBest !== null ? `Best ${formatSecs(activeBest * 1000)}` : '—'}</HudChip>
            <button
              type="button"
              aria-pressed={stepMode}
              aria-label="Step mode — tap the pieces in order"
              onClick={() => resetRun(undefined, !stepMode)}
              className={cn(
                'grid h-11 w-11 shrink-0 place-items-center rounded-full',
                stepMode ? 'bg-accentbg text-accent' : 'text-ink3',
              )}
            >
              <ListOrdered className="h-5 w-5" />
            </button>
          </>
        }
      />

      <div
        className="flex min-h-[44px] shrink-0 items-stretch gap-1 rounded-full bg-panel2 p-1"
        role="tablist"
        aria-label="Cue tier"
      >
        {TIERS.map((t) => {
          const locked = (t.id === 2 && !unlocked[2]) || (t.id === 3 && !unlocked[3]);
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tier === t.id}
              aria-label={locked ? `${t.name} — locked` : t.name}
              disabled={locked}
              onClick={() => {
                if (!locked && tier !== t.id) resetRun(t.id);
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-full text-[12px] font-semibold',
                tier === t.id ? 'bg-accent text-white' : locked ? 'text-ink3' : 'text-ink2',
              )}
            >
              {t.name}
              {locked && <Lock className="h-3 w-3 text-ink3" aria-hidden />}
            </button>
          );
        })}
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={gridRef}
          data-noswipe
          className={cn(
            'stroke-grid grid h-full w-full',
            winStage === 'stack' && 'stroke-grid-out',
          )}
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            gap: 10,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {tiles.map((p) => {
            const meta = BLOCK_META[blockKind(p)];
            const idx = capturedTiles.indexOf(p.id);
            const isCap = idx !== -1;
            const unlightIdx = fx?.kind === 'shatter' ? fx.tiles.indexOf(p.id) : -1;
            const chip = dupIndex.get(p.id);
            return (
              <div
                key={p.id}
                ref={(el) => {
                  if (el) tileEls.current.set(p.id, el);
                  else tileEls.current.delete(p.id);
                }}
                role="button"
                tabIndex={stepMode ? 0 : -1}
                aria-label={
                  isCap
                    ? `${p.role}, captured ${idx + 1} of ${n}`
                    : `${p.role}${chip !== undefined ? ` ${chip}` : ''}${tier === 1 ? `, ${pieceFirstLine(p.code)}` : ''}`
                }
                onKeyDown={
                  stepMode
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (phase !== 'won') stepTap(p);
                        }
                      }
                    : undefined
                }
                className={cn(
                  'blk stroke-tile',
                  meta.shape,
                  isCap && 'stroke-tile--captured',
                  unlightIdx !== -1 && 'stroke-unlight',
                )}
                style={
                  {
                    '--blk-stroke': isCap ? 'var(--accent)' : meta.stroke,
                    ...(unlightIdx !== -1 && fx
                      ? { '--unlight-delay': `${(fx.tiles.length - 1 - unlightIdx) * 30}ms` }
                      : null),
                  } as CSSProperties
                }
              >
                <div className="blk-face">
                  {isCap && (
                    <span className="stroke-order asm-stamp inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold tabular-nums text-white">
                      {idx + 1}
                    </span>
                  )}
                  {tier === 3 && !isCap ? (
                    <span
                      className="font-mono text-[26px] leading-none"
                      style={{ color: meta.text, opacity: 0.3 }}
                      aria-hidden
                    >
                      {meta.glyph}
                    </span>
                  ) : (
                    <>
                      <span
                        className={cn(
                          'font-mono leading-none',
                          isCap ? 'text-[15px]' : 'text-[25px]',
                        )}
                        style={{ color: meta.text }}
                        aria-hidden
                      >
                        {meta.glyph}
                      </span>
                      {isCap && (
                        <span className="stroke-clamp2 w-full font-mono text-[11px] leading-tight text-ink">
                          {p.code}
                        </span>
                      )}
                      {!isCap && tier === 1 && (
                        <span className="stroke-clamp1 w-full font-mono text-[11px] text-ink">
                          {pieceFirstLine(p.code)}
                        </span>
                      )}
                      {!isCap && (
                        <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink3">
                          {p.role}
                          {tier === 1 && chip !== undefined && (
                            <span className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-panel px-0.5 text-[8px] tabular-nums">
                              {chip}
                            </span>
                          )}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden>
          {!reducedMotion && (
            <polyline
              ref={haloEl}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={18}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.25}
              points=""
            />
          )}
          {segments.map((s) => (
            <line
              key={s.key}
              x1={s.a.x}
              y1={s.a.y}
              x2={s.b.x}
              y2={s.b.y}
              pathLength={1}
              stroke="var(--accent)"
              strokeWidth={6}
              strokeLinecap="round"
              opacity={0.85}
              className={reducedMotion ? undefined : 'stroke-seg'}
            />
          ))}
          <line
            ref={liveLineEl}
            visibility="hidden"
            stroke="var(--accent)"
            strokeWidth={6}
            strokeLinecap="round"
            opacity={0.85}
          />
          {fx && fx.points && (
            <polyline
              points={fx.points}
              fill="none"
              pathLength={1}
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke={fx.kind === 'shatter' ? 'var(--bad)' : 'var(--text-3)'}
              className={fx.kind === 'shatter' ? 'stroke-trail-shatter' : 'stroke-trail-lift'}
            />
          )}
          {winStage === 'pulse' && winInfo && (
            <polyline
              points={winInfo.points}
              fill="none"
              stroke="var(--good)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-win-pulse"
            />
          )}
        </svg>

        {winStage === 'pulse' && <ConfettiBurst count={18} />}

        {winStage === 'stack' && winInfo && (
          <div className="absolute inset-0 z-20 flex flex-col">
            <div
              className={cn(
                'blk-board stroke-stack min-h-0 flex-1 overflow-y-auto px-1 pb-2',
                reducedMotion && 'stroke-fade-in',
              )}
            >
              {pieces.map((p, i) => (
                <div key={p.id} className="blk-row" style={{ '--seam-i': i } as CSSProperties}>
                  <GameBlock piece={p} compact />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-2">
              <div className="pointer-events-auto w-full">
                <WinCard
                  title={winInfo.step ? 'Stepped through!' : 'One stroke!'}
                  stats={[
                    {
                      label: winInfo.step ? 'Step time' : 'Stroke time',
                      value: fmtClock(winInfo.ms),
                    },
                    { label: 'Broken strokes', value: String(winInfo.broken) },
                    { label: 'Tier', value: tierMeta?.name ?? String(tier) },
                  ]}
                  badges={[{ icon: Sparkles, label: 'Flawless', earned: winInfo.perfect }]}
                  newBest={winInfo.newBest}
                  primaryLabel={
                    activeBest !== null
                      ? `Run it back — beat ${formatSecs(activeBest * 1000)}`
                      : 'Run it back'
                  }
                  onPrimary={() => resetRun()}
                  {...winSecondary}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </div>
  );
}
