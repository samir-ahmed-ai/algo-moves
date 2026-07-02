import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameRoom } from '../../net/useGameRoom';
import { useGameChannel } from '../../net/useGameChannel';
import { GameBody, ResultBanner, TouchButton, TurnBadge, WaitingForPeer } from '../../ui/gamesUi';
import { FALSE_START, matchOver, roundWinner, WIN_TARGET } from './logic';

type ReactionMsg =
  | { kind: 'go'; round: number }
  | { kind: 'tap'; round: number; ms: number }
  | { kind: 'rematch' };

// idle: between rounds before arming · waiting: armed, wait for green ·
// go: green, tap now · tapped: my tap recorded, waiting for peer ·
// result: both taps in, showing outcome · over: match done
type Phase = 'idle' | 'waiting' | 'go' | 'tapped' | 'result' | 'over';

const ARM_MIN_MS = 1200;
const ARM_MAX_MS = 3500;
const RESULT_MS = 2400;

export function ReactionDuel() {
  const { self, peer, connected } = useGameRoom();
  const amHost = self?.role === 'host';

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [myMs, setMyMs] = useState<number | null>(null);
  const [peerTaps, setPeerTaps] = useState<Record<number, number>>({});
  const [scores, setScores] = useState({ me: 0, peer: 0 });

  const goTimeRef = useRef<number | null>(null);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendRef = useRef<(msg: ReactionMsg) => void>(() => {});

  const clearArmTimer = useCallback(() => {
    if (armTimerRef.current) {
      clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
  }, []);

  const peerMs = peerTaps[round] ?? null;

  // The host arms the round: schedule green, then broadcast 'go'.
  const armRound = useCallback(
    (r: number) => {
      clearArmTimer();
      goTimeRef.current = null;
      setPhase('waiting');
      const delay = ARM_MIN_MS + Math.random() * (ARM_MAX_MS - ARM_MIN_MS);
      armTimerRef.current = setTimeout(() => {
        goTimeRef.current = performance.now();
        setPhase('go');
        sendRef.current({ kind: 'go', round: r });
      }, delay);
    },
    [clearArmTimer],
  );

  const resetMatch = useCallback(() => {
    clearArmTimer();
    goTimeRef.current = null;
    setRound(0);
    setMyMs(null);
    setPeerTaps({});
    setScores({ me: 0, peer: 0 });
    setPhase('idle');
  }, [clearArmTimer]);

  const send = useGameChannel<ReactionMsg>((msg) => {
    if (msg.kind === 'go') {
      // Guest turns green when the host says so, for the current round only.
      if (msg.round !== round) return;
      goTimeRef.current = performance.now();
      setPhase((p) => (p === 'waiting' ? 'go' : p));
    } else if (msg.kind === 'tap') {
      setPeerTaps((prev) => ({ ...prev, [msg.round]: msg.ms }));
    } else if (msg.kind === 'rematch') {
      resetMatch();
    }
  });
  sendRef.current = send;

  // Host arms whenever we're idle with no pending tap — covers the initial round
  // AND any rematch (local or peer-initiated), so a guest's "Play again" re-arms
  // the host instead of leaving both stuck on "Get ready…".
  useEffect(() => {
    if (connected && amHost && phase === 'idle' && myMs === null) armRound(round);
  }, [connected, amHost, phase, myMs, round, armRound]);

  const tap = () => {
    if (phase !== 'waiting' && phase !== 'go') return;
    const ms = phase === 'go' && goTimeRef.current != null
      ? performance.now() - goTimeRef.current
      : FALSE_START;
    setMyMs(ms);
    setPhase('tapped');
    send({ kind: 'tap', round, ms });
  };

  // Once both taps for the round are in, score it, show the result, then advance.
  useEffect(() => {
    if (phase !== 'tapped' || myMs === null || peerMs === null) return;
    const w = roundWinner(myMs, peerMs);
    const nextScores = {
      me: scores.me + (w === 'me' ? 1 : 0),
      peer: scores.peer + (w === 'peer' ? 1 : 0),
    };
    setScores(nextScores);
    setPhase('result');

    const t = setTimeout(() => {
      if (matchOver(nextScores.me, nextScores.peer)) {
        setPhase('over');
      } else {
        const next = round + 1;
        setRound(next);
        setMyMs(null);
        goTimeRef.current = null;
        if (amHost) armRound(next);
        else setPhase('waiting');
      }
    }, RESULT_MS);
    return () => clearTimeout(t);
  }, [phase, myMs, peerMs, scores.me, scores.peer, round, amHost, armRound]);

  // Clean up any pending arm timer on unmount.
  useEffect(() => clearArmTimer, [clearArmTimer]);

  const rematch = () => {
    // resetMatch drops us to phase 'idle'; the arming effect above re-arms the host.
    resetMatch();
    send({ kind: 'rematch' });
  };

  if (!connected) return <WaitingForPeer name={peer?.name} />;

  const meName = self?.name ?? 'You';
  const peerName = peer?.name ?? 'Partner';

  if (phase === 'over') {
    const won = scores.me > scores.peer;
    return (
      <GameBody>
        <Scoreboard me={meName} peer={peerName} myScore={scores.me} peerScore={scores.peer} />
        <ResultBanner
          tone={won ? 'win' : 'lose'}
          title={won ? '⚡ You win!' : `${peerName} wins`}
          detail={`${scores.me} – ${scores.peer}`}
        />
        <TouchButton variant="primary" size="lg" onClick={rematch}>
          Play again
        </TouchButton>
      </GameBody>
    );
  }

  const roundW = phase === 'result' && myMs !== null && peerMs !== null ? roundWinner(myMs, peerMs) : null;

  return (
    <GameBody>
      <Scoreboard me={meName} peer={peerName} myScore={scores.me} peerScore={scores.peer} />
      <p className="text-center text-xs text-ink3">First to {WIN_TARGET} wins · tap the instant it turns green</p>

      <TapZone phase={phase} myMs={myMs} peerName={peerName} onTap={tap} />

      {phase === 'result' && roundW ? (
        <ResultBanner
          tone={roundW === 'me' ? 'win' : roundW === 'peer' ? 'lose' : 'draw'}
          title={roundW === 'me' ? 'You took it! 🙌' : roundW === 'peer' ? `${peerName} was faster` : 'Dead heat 🤝'}
          detail={
            <span className="font-mono">
              {fmt(myMs)} vs {fmt(peerMs)}
            </span>
          }
        />
      ) : (
        <div className="flex justify-center">
          <TurnBadge tone={phase === 'go' ? 'you' : 'wait'}>
            {phase === 'go'
              ? 'GO — tap!'
              : phase === 'tapped'
                ? `Waiting for ${peerName}…`
                : 'Get ready…'}
          </TurnBadge>
        </div>
      )}
    </GameBody>
  );
}

function fmt(ms: number | null): string {
  if (ms === null) return '—';
  if (ms >= FALSE_START) return 'false start';
  return `${Math.round(ms)} ms`;
}

function TapZone({
  phase,
  myMs,
  peerName,
  onTap,
}: {
  phase: Phase;
  myMs: number | null;
  peerName: string;
  onTap: () => void;
}) {
  const armed = phase === 'waiting';
  const go = phase === 'go';
  const tapped = phase === 'tapped' || phase === 'result';
  const falseStart = myMs !== null && myMs >= FALSE_START;

  let tone = 'border-edge bg-panel text-ink2';
  if (armed) tone = 'border-amber-400/50 bg-amber-500/10 text-amber-500';
  else if (go) tone = 'border-good/60 bg-good/15 text-good';
  else if (tapped) tone = falseStart ? 'border-bad/50 bg-badbg text-bad' : 'border-accent/40 bg-accentbg text-accent';

  let heading = 'Get ready…';
  let sub = 'The zone turns green — tap the instant it does.';
  if (armed) {
    heading = 'Wait for green…';
    sub = 'Do not tap yet!';
  } else if (go) {
    heading = 'TAP!';
    sub = 'Now!';
  } else if (tapped) {
    if (falseStart) {
      heading = 'Too soon! 😬';
      sub = 'False start — you lose this round.';
    } else {
      heading = `You: ${fmt(myMs)}`;
      sub = phase === 'result' ? 'Round done.' : `Waiting for ${peerName}…`;
    }
  }

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!armed && !go}
      aria-label={heading}
      className={
        'flex h-[clamp(9rem,45dvh,16rem)] w-full select-none touch-manipulation flex-col items-center justify-center gap-2 ' +
        'rounded-[var(--radius)] border-2 p-6 text-center transition-colors active:scale-[0.99] ' +
        'disabled:active:scale-100 ' +
        tone
      }
    >
      <span className="text-3xl font-black tracking-tight sm:text-4xl">{heading}</span>
      <span className="text-sm font-medium opacity-90">{sub}</span>
    </button>
  );
}

function Scoreboard({
  me,
  peer,
  myScore,
  peerScore,
}: {
  me: string;
  peer: string;
  myScore: number;
  peerScore: number;
}) {
  return (
    <div className="flex items-center justify-center gap-4 text-center">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{me}</div>
        <div className="font-mono text-3xl font-bold tabular-nums text-accent">{myScore}</div>
      </div>
      <span className="text-sm font-semibold text-ink3">vs</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{peer}</div>
        <div className="font-mono text-3xl font-bold tabular-nums text-ink2">{peerScore}</div>
      </div>
    </div>
  );
}

export default ReactionDuel;
