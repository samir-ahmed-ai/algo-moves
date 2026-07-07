import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getArcadeStrings, useGamesLocale } from '../../locale';
import { useGameRoom } from '../../net/useGameRoom';
import { useGameChannel } from '../../net/useGameChannel';
import { useMatchReporter } from '../../net/useMatchReporter';
import type { Peer } from '../../net/protocol';
import { GameArena, GameBody, ResultBanner, TouchButton, TurnBadge, WaitingForPeer } from '../../ui/gamesUi';
import { Avatar } from '../../ui/Avatar';
import { Confetti, CountdownRing } from '../../ui/effects';
import { usePrefersReducedMotion } from '../../ui/hooks';
import { playCue } from '@/lib/utils/audio';
import { hapticError, hapticSuccess } from '@/lib/utils/haptic';
import {
  FALSE_START,
  isFalseStart,
  matchOver,
  placementsByScore,
  resolveRound,
  WIN_TARGET,
} from './logic';
import { getReactionDuelStrings } from './strings';

/**
 * The host is authoritative: it arms each round, calls the green, gathers every
 * racer's tap time, resolves the round with the pure logic, then broadcasts the
 * outcome + running scores. Guests race locally and send their tap; spectators
 * simply render the broadcast state. This keeps 2-player play identical while
 * extending cleanly to an N-player "reaction ladder".
 */

/** A per-round result the host broadcasts to everyone (players + spectators). */
interface RoundResult {
  round: number;
  /** peerId → reaction time in ms (FALSE_START for a jump). */
  taps: Record<string, number>;
  /** Winning peerId, or null for a washed round (all false starts / tie). */
  winnerId: string | null;
  /** peerId → accumulated round wins after this round. */
  scores: Record<string, number>;
  over: boolean;
}

type ReactionMsg =
  | { kind: 'go'; round: number }
  | { kind: 'tap'; round: number; ms: number }
  | { kind: 'result'; result: RoundResult }
  | { kind: 'rematch' };

// idle: between rounds before arming · armed: green pending, hold · go: green now,
// tap! · tapped: my tap recorded, awaiting the field · result: outcome shown · over
type Phase = 'idle' | 'armed' | 'go' | 'tapped' | 'result' | 'over';

const ARM_MIN_MS = 1200;
const ARM_MAX_MS = 3500;
const RESULT_MS = 2600;
// Soft ceiling for the "tap now" window, used to drive the countdown ring.
const GO_WINDOW_MS = 2000;

export function ReactionDuel() {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getReactionDuelStrings(locale), [locale]);
  const arcade = useMemo(() => getArcadeStrings(locale), [locale]);
  const reduced = usePrefersReducedMotion();

  const { self, peer, players, connected, isSpectator } = useGameRoom();
  const { report } = useMatchReporter('reaction-duel');
  const amHost = self?.role === 'host';

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [myMs, setMyMs] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  // Full history of resolved rounds, so we can show per-round ms + score pips.
  const [results, setResults] = useState<RoundResult[]>([]);
  // The green-window countdown fraction (1 → 0) while phase === 'go'.
  const [goProgress, setGoProgress] = useState(1);

  const goTimeRef = useRef<number | null>(null);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendRef = useRef<(msg: ReactionMsg) => void>(() => {});
  // Host-only: taps collected for the current round, keyed by peerId.
  const roundTapsRef = useRef<Record<string, number>>({});
  const reportedRef = useRef(false);

  const clearArmTimer = useCallback(() => {
    if (armTimerRef.current) {
      clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
  }, []);

  const myId = self?.id ?? '';
  const currentResult = results.find((r) => r.round === round) ?? null;

  // The host arms the round: schedule green, then broadcast 'go'.
  const armRound = useCallback(
    (r: number) => {
      clearArmTimer();
      goTimeRef.current = null;
      roundTapsRef.current = {};
      setPhase('armed');
      const delay = ARM_MIN_MS + Math.random() * (ARM_MAX_MS - ARM_MIN_MS);
      armTimerRef.current = setTimeout(() => {
        goTimeRef.current = performance.now();
        setPhase('go');
        playCue('go');
        sendRef.current({ kind: 'go', round: r });
      }, delay);
    },
    [clearArmTimer],
  );

  const resetMatch = useCallback(() => {
    clearArmTimer();
    goTimeRef.current = null;
    roundTapsRef.current = {};
    reportedRef.current = false;
    setRound(0);
    setMyMs(null);
    setScores({});
    setResults([]);
    setPhase('idle');
  }, [clearArmTimer]);

  // Host-only: once every active player has tapped, resolve + broadcast.
  const maybeResolve = useCallback(
    (r: number) => {
      if (!amHost) return;
      const activeIds = players.map((p) => p.id);
      const taps = roundTapsRef.current;
      if (activeIds.some((id) => taps[id] === undefined)) return; // still waiting

      const { winnerId } = resolveRound(taps);
      const nextScores: Record<string, number> = { ...scores };
      if (winnerId) nextScores[winnerId] = (nextScores[winnerId] ?? 0) + 1;
      const over = matchOver(...Object.values(nextScores));

      const result: RoundResult = { round: r, taps: { ...taps }, winnerId, scores: nextScores, over };
      setResults((prev) => [...prev.filter((x) => x.round !== r), result]);
      setScores(nextScores);
      setPhase('result');
      sendRef.current({ kind: 'result', result });
    },
    [amHost, players, scores],
  );

  const send = useGameChannel<ReactionMsg>((msg, fromId) => {
    if (msg.kind === 'go') {
      // Everyone flips to green when the host says so, for the current round only.
      if (msg.round !== round) return;
      goTimeRef.current = performance.now();
      playCue('go');
      setPhase((p) => (p === 'armed' || p === 'idle' ? 'go' : p));
    } else if (msg.kind === 'tap') {
      // Host tallies remote taps toward the round it is running.
      if (!amHost) return;
      roundTapsRef.current = { ...roundTapsRef.current, [fromId]: msg.ms };
      maybeResolve(msg.round);
    } else if (msg.kind === 'result') {
      // Guests + spectators adopt the host's authoritative outcome.
      if (amHost) return;
      const r = msg.result;
      setResults((prev) => [...prev.filter((x) => x.round !== r.round), r]);
      setScores(r.scores);
      setPhase('result');
    } else if (msg.kind === 'rematch') {
      resetMatch();
    }
  });
  sendRef.current = send;

  // Host arms whenever it is idle at the start of a round (initial + rematch).
  useEffect(() => {
    if (connected && amHost && !isSpectator && phase === 'idle') armRound(round);
  }, [connected, amHost, isSpectator, phase, round, armRound]);

  const tap = () => {
    if (isSpectator) return;
    if (phase !== 'armed' && phase !== 'go') return;
    const ms =
      phase === 'go' && goTimeRef.current != null ? performance.now() - goTimeRef.current : FALSE_START;
    setMyMs(ms);
    setPhase('tapped');

    if (isFalseStart(ms)) {
      playCue('error');
      if (!reduced) hapticError();
    } else {
      playCue('select');
    }

    if (amHost) {
      // The host records its own tap locally and checks for resolution.
      roundTapsRef.current = { ...roundTapsRef.current, [myId]: ms };
      maybeResolve(round);
    } else {
      send({ kind: 'tap', round, ms });
    }
  };

  // Drive the green-window countdown ring while waiting for this client's tap.
  useEffect(() => {
    if (phase !== 'go' || reduced) {
      setGoProgress(1);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const frac = Math.max(0, 1 - (performance.now() - start) / GO_WINDOW_MS);
      setGoProgress(frac);
      if (frac > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, round, reduced]);

  // React to a resolved round: play cues, then advance or finish.
  useEffect(() => {
    if (phase !== 'result' || !currentResult) return;
    const iWon = currentResult.winnerId === myId;
    if (!isSpectator) {
      if (currentResult.over) {
        // Final-round cue is handled by the 'over' effect below.
      } else if (iWon) {
        playCue('win');
      } else if (currentResult.winnerId) {
        playCue('lose');
      } else {
        playCue('draw');
      }
    }

    const timer = setTimeout(() => {
      if (currentResult.over) {
        setPhase('over');
      } else {
        const next = round + 1;
        setRound(next);
        setMyMs(null);
        goTimeRef.current = null;
        roundTapsRef.current = {};
        // Host re-arms; everyone else waits for the next 'go'.
        if (amHost && !isSpectator) armRound(next);
        else setPhase('idle');
      }
    }, RESULT_MS);
    return () => clearTimeout(timer);
  }, [phase, currentResult, myId, round, amHost, isSpectator, armRound]);

  // On match over: celebratory cue/haptic for players, and host reports once.
  const iAmMatchWinner = useMemo(() => {
    if (phase !== 'over') return false;
    const top = Math.max(0, ...Object.values(scores));
    return top > 0 && scores[myId] === top;
  }, [phase, scores, myId]);

  useEffect(() => {
    if (phase !== 'over') return;
    if (!isSpectator) {
      if (iAmMatchWinner) {
        playCue('win');
        if (!reduced) hapticSuccess();
      } else {
        playCue('lose');
        if (!reduced) hapticError();
      }
    }
    if (amHost && !reportedRef.current) {
      reportedRef.current = true;
      const filled: Record<string, number> = {};
      for (const p of players) filled[p.id] = scores[p.id] ?? 0;
      const places = placementsByScore(filled);
      void report(
        players.map((p) => ({ peerId: p.id, placement: places[p.id] ?? players.length, score: filled[p.id] })),
      );
    }
  }, [phase, isSpectator, iAmMatchWinner, reduced, amHost, players, scores, report]);

  // Clean up any pending arm timer on unmount.
  useEffect(() => clearArmTimer, [clearArmTimer]);

  const rematch = () => {
    resetMatch();
    send({ kind: 'rematch' });
  };

  if (!connected) {
    return <WaitingForPeer message={arcade.waitingReconnect(peer?.name ?? t.partner)} />;
  }

  const nPlayer = players.length > 2;

  // ---- End of match ---------------------------------------------------------
  if (phase === 'over') {
    const ordered = orderByScore(players, scores, myId);
    const top = Math.max(0, ...Object.values(scores));
    const winners = players.filter((p) => (scores[p.id] ?? 0) === top && top > 0);
    const tie = winners.length !== 1;

    let tone: 'win' | 'lose' | 'draw' = 'draw';
    let title = t.matchTie;
    if (!tie) {
      const w = winners[0];
      if (w.id === myId && !isSpectator) {
        tone = 'win';
        title = t.youWin;
      } else {
        tone = isSpectator ? 'draw' : 'lose';
        title = t.peerWins(w.name);
      }
    }

    return (
      <GameBody>
        <div className="relative">
          <Confetti fire={iAmMatchWinner} />
          <Ladder ordered={ordered} scores={scores} myId={myId} nPlayer={nPlayer} strings={t} />
        </div>
        <ResultBanner tone={tone} title={title} detail={<ScoreLine ordered={ordered} scores={scores} />} />
        {results.length > 0 ? <History results={results} players={players} myId={myId} strings={t} /> : null}
        {!isSpectator ? (
          <TouchButton variant="primary" size="md" className="w-full" onClick={rematch}>
            {t.playAgain}
          </TouchButton>
        ) : (
          <p className="text-center text-xs text-ink3">{t.spectating}</p>
        )}
      </GameBody>
    );
  }

  // ---- In-progress view -----------------------------------------------------
  const ordered = orderByScore(players, scores, myId);
  const winnerName = currentResult?.winnerId
    ? players.find((p) => p.id === currentResult.winnerId)?.name ?? t.partner
    : null;
  const iWonRound = currentResult?.winnerId === myId;
  const showResult = phase === 'result' && !!currentResult;

  return (
    <GameBody>
      <Ladder ordered={ordered} scores={scores} myId={myId} nPlayer={nPlayer} strings={t} />
      <p className="text-center text-xs text-ink3">
        {isSpectator
          ? t.liveRound(round + 1)
          : `${t.firstTo(WIN_TARGET)} · ${nPlayer ? t.fastestWins : t.tapWhenGreen}`}
      </p>

      <GameArena accent="#10b981">
        <TapZone
          phase={phase}
          myMs={myMs}
          goProgress={goProgress}
          isSpectator={isSpectator}
          reduced={reduced}
          onTap={tap}
          strings={t}
        />
      </GameArena>

      {showResult ? (
        <ResultBanner
          tone={isSpectator ? 'draw' : iWonRound ? 'win' : currentResult!.winnerId ? 'lose' : 'draw'}
          title={
            isSpectator
              ? winnerName
                ? t.peerWins(winnerName)
                : t.deadHeat
              : iWonRound
                ? t.youTookIt
                : winnerName
                  ? t.peerWasFaster(winnerName)
                  : t.deadHeat
          }
          detail={<RoundTimes result={currentResult!} players={players} myId={myId} strings={t} />}
        />
      ) : (
        <div className="flex justify-center">
          <TurnBadge tone={phase === 'go' ? 'you' : 'wait'}>
            {isSpectator
              ? t.racersReady(players.length)
              : phase === 'go'
                ? t.goTap
                : phase === 'tapped'
                  ? nPlayer
                    ? t.waitingForYou
                    : t.waitingForPeer(peer?.name ?? t.partner)
                  : t.getReady}
          </TurnBadge>
        </div>
      )}
    </GameBody>
  );
}

function fmt(ms: number | null, strings: { falseStart: string; ms: (n: number) => string; noTime: string }): string {
  if (ms === null) return strings.noTime;
  if (isFalseStart(ms)) return strings.falseStart;
  return strings.ms(Math.round(ms));
}

function orderByScore(players: Peer[], scores: Record<string, number>, myId: string): Peer[] {
  return [...players].sort((a, b) => {
    const d = (scores[b.id] ?? 0) - (scores[a.id] ?? 0);
    if (d !== 0) return d;
    if (a.id === myId) return -1;
    if (b.id === myId) return 1;
    return 0;
  });
}

function TapZone({
  phase,
  myMs,
  goProgress,
  isSpectator,
  reduced,
  onTap,
  strings,
}: {
  phase: Phase;
  myMs: number | null;
  goProgress: number;
  isSpectator: boolean;
  reduced: boolean;
  onTap: () => void;
  strings: ReturnType<typeof getReactionDuelStrings>;
}) {
  const armed = phase === 'armed';
  const go = phase === 'go';
  const tapped = phase === 'tapped' || phase === 'result';
  const falseStart = myMs !== null && isFalseStart(myMs);

  let tone = 'border-edge bg-panel text-ink2';
  if (armed) tone = 'border-amber-400/50 bg-amber-500/10 text-amber-500';
  else if (go) tone = 'border-good/60 bg-good/15 text-good';
  else if (tapped) tone = falseStart ? 'border-bad/50 bg-badbg text-bad' : 'border-accent/40 bg-accentbg text-accent';

  let heading = strings.getReady;
  let sub = strings.tapWhenGreen;
  if (armed) {
    heading = strings.waitForGreen;
    sub = strings.doNotTapYet;
  } else if (go) {
    heading = strings.tapNow;
    sub = strings.now;
  } else if (tapped) {
    if (falseStart) {
      heading = strings.tooSoon;
      sub = strings.falseStartLose;
    } else {
      heading = strings.yourTime(fmt(myMs, strings));
      sub = phase === 'result' ? strings.roundDone : strings.waitingForYou;
    }
  }

  const interactive = !isSpectator && (armed || go);

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!interactive}
      aria-label={heading}
      className={
        'relative flex h-[clamp(5.5rem,26dvh,9rem)] w-full select-none touch-manipulation flex-col items-center justify-center gap-1 ' +
        'rounded-xl border-2 p-3 text-center transition-colors active:scale-[0.99] ' +
        'disabled:active:scale-100 ' +
        (go && !reduced ? 'reaction-go-pop ' : '') +
        (falseStart && !reduced ? 'reaction-shake ' : '') +
        tone
      }
    >
      {go && !isSpectator ? (
        <span className="absolute right-3 top-3">
          <CountdownRing progress={goProgress} tone="good" size={30} />
        </span>
      ) : null}
      <span className="text-xl font-black tracking-tight sm:text-2xl">{heading}</span>
      <span className="text-[10px] font-medium opacity-90">{sub}</span>
      <style>{`
        @keyframes reactionGoPop { 0% { transform: scale(0.97); } 60% { transform: scale(1.015); } 100% { transform: scale(1); } }
        .reaction-go-pop { animation: reactionGoPop 220ms cubic-bezier(0.2,0.7,0.2,1); }
        @keyframes reactionShake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        .reaction-shake { animation: reactionShake 320ms ease-in-out; }
      `}</style>
    </button>
  );
}

/**
 * Compact leaderboard row per player with best-of score pips. In 2-player mode
 * it reads like the original head-to-head scoreboard; with more players it
 * stacks the whole field.
 */
function Ladder({
  ordered,
  scores,
  myId,
  nPlayer,
  strings,
}: {
  ordered: Peer[];
  scores: Record<string, number>;
  myId: string;
  nPlayer: boolean;
  strings: ReturnType<typeof getReactionDuelStrings>;
}) {
  if (!nPlayer) {
    // Classic two-player head-to-head layout.
    const me = ordered.find((p) => p.id === myId) ?? ordered[0];
    const other = ordered.find((p) => p.id !== myId) ?? ordered[1];
    return (
      <div className="flex items-center justify-center gap-3 text-center">
        <PlayerCell peer={me} name={strings.you} score={scores[me?.id ?? ''] ?? 0} mine />
        <span className="text-xs font-semibold text-ink3">vs</span>
        <PlayerCell peer={other} name={other?.name} score={scores[other?.id ?? ''] ?? 0} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {ordered.map((p) => {
        const mine = p.id === myId;
        const s = scores[p.id] ?? 0;
        return (
          <div
            key={p.id}
            className={
              'flex items-center gap-2.5 rounded-[var(--radius)] border px-3 py-2 ' +
              (mine ? 'border-accent/50 bg-accentbg' : 'border-edge bg-panel')
            }
          >
            <Avatar seed={p.id} name={p.name} size={26} />
            <span className={'min-w-0 flex-1 truncate text-sm font-semibold ' + (mine ? 'text-accent' : 'text-ink')}>
              {mine ? strings.you : p.name}
            </span>
            <Pips score={s} />
            <span className="w-5 text-right font-mono text-sm font-bold tabular-nums text-ink2">{s}</span>
          </div>
        );
      })}
    </div>
  );
}

function PlayerCell({ peer, name, score, mine }: { peer?: Peer; name?: string; score: number; mine?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      {peer ? <Avatar seed={peer.id} name={peer.name} size={26} /> : null}
      <div className="truncate text-xs font-semibold text-ink">{name ?? '—'}</div>
      <div className={cn('font-mono text-xl font-bold tabular-nums ' + (mine ? 'text-accent' : 'text-ink2'))}>{score}</div>
      <Pips score={score} />
    </div>
  );
}

/** Best-of progress pips: filled dots for round wins, up to WIN_TARGET. */
function Pips({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: WIN_TARGET }, (_, i) => (
        <span key={i} className={'h-2 w-2 rounded-full ' + (i < score ? 'bg-good' : 'bg-edge2')} />
      ))}
    </span>
  );
}

/** Millisecond readout for a resolved round, sorted fastest-first. */
function RoundTimes({
  result,
  players,
  myId,
  strings,
}: {
  result: RoundResult;
  players: Peer[];
  myId: string;
  strings: ReturnType<typeof getReactionDuelStrings>;
}) {
  const rows = Object.entries(result.taps)
    .map(([id, ms]) => ({ id, ms, name: players.find((p) => p.id === id)?.name ?? '?' }))
    .sort((a, b) => a.ms - b.ms);
  return (
    <span className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 font-mono text-sm">
      {rows.map((r) => (
        <span key={r.id} className={r.id === result.winnerId ? 'font-bold' : 'opacity-80'}>
          {r.id === myId ? strings.you : r.name}: {fmt(r.ms, strings)}
        </span>
      ))}
    </span>
  );
}

/** Per-round history grid — one row per resolved round with each racer's time. */
function History({
  results,
  players,
  myId,
  strings,
}: {
  results: RoundResult[];
  players: Peer[];
  myId: string;
  strings: ReturnType<typeof getReactionDuelStrings>;
}) {
  const ordered = [...results].sort((a, b) => a.round - b.round);
  return (
    <div className="rounded-xl border border-edge bg-panel2 p-2.5">
      <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-ink3">{strings.history}</p>
      <div className="flex flex-col gap-1.5">
        {ordered.map((res) => {
          const rows = Object.entries(res.taps)
            .map(([id, ms]) => ({ id, ms, name: players.find((p) => p.id === id)?.name ?? '?' }))
            .sort((a, b) => a.ms - b.ms);
          return (
            <div key={res.round} className="flex items-center gap-2 text-xs">
              <span className="w-6 shrink-0 font-mono text-ink3">{res.round + 1}</span>
              <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 font-mono">
                {rows.map((r) => (
                  <span
                    key={r.id}
                    className={
                      r.id === res.winnerId ? 'font-bold text-good' : r.id === myId ? 'text-ink2' : 'text-ink3'
                    }
                  >
                    {(r.id === myId ? strings.you : r.name)}: {fmt(r.ms, strings)}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoreLine({ ordered, scores }: { ordered: Peer[]; scores: Record<string, number> }) {
  return <span className="font-mono tabular-nums">{ordered.map((p) => scores[p.id] ?? 0).join(' – ')}</span>;
}

export default ReactionDuel;
