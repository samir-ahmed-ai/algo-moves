import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, Loader2, Lock, Minus, Plus } from 'lucide-react';
import { getArcadeStrings, useGamesLocale } from '../../locale';
import { useGameRoom } from '../../net/useGameRoom';
import { useGameChannel } from '../../net/useGameChannel';
import { useMatchReporter } from '../../net/useMatchReporter';
import { GameBody, ResultBanner, TouchButton, TurnBadge, WaitingForPeer } from '../../ui/gamesUi';
import { Confetti, CountdownRing } from '../../ui/effects';
import { usePrefersReducedMotion } from '../../ui/hooks';
import { Avatar } from '../../ui/Avatar';
import { cn } from '@/lib/utils/cn';
import { playCue } from '@/lib/utils/audio';
import { hapticError, hapticSuccess } from '@/lib/utils/haptic';
import {
  clampNumber,
  decideWinner,
  evaluateGuess,
  MAX_NUMBER,
  MIN_NUMBER,
  narrowedRange,
  proximityBand,
  proximityFraction,
  type GuessResult,
  type HeatLevel,
} from './logic';
import { getNumberDuelStrings } from './strings';

type Attempt = { value: number; result: GuessResult; heat: HeatLevel; frac: number };

type Msg =
  | { kind: 'ready' }
  | { kind: 'guess'; value: number }
  | { kind: 'feedback'; value: number; result: GuessResult; heat: HeatLevel; frac: number; count: number }
  // Keeper → spectators/late joiners: enough to render a read-only view.
  | { kind: 'snapshot'; round: number; keeperName: string; guesserName: string; attempts: Attempt[] }
  | { kind: 'rematch' };

// setup: keeper picks a secret · waitingKeeper: guesser waits · watching: keeper
// watches guesses · guessing: guesser guesses · roundResult: brief recap · over
type Phase = 'setup' | 'waitingKeeper' | 'watching' | 'guessing' | 'roundResult' | 'over';

const TOTAL_ROUNDS = 2;
const ROUND_RECAP_MS = 2600;
const TURN_SECONDS = 25; // per-guess soft timer; on expiry we auto-submit the dialed value

/** Tailwind heat palette shared by the meter and the guess pips. */
const HEAT_STYLE: Record<HeatLevel, { text: string; ring: string; bar: string }> = {
  burning: { text: 'text-bad', ring: 'border-bad/60 bg-bad/10 text-bad', bar: 'bg-bad' },
  hot: { text: 'text-orange-500', ring: 'border-orange-400/60 bg-orange-400/10 text-orange-500', bar: 'bg-orange-500' },
  warm: { text: 'text-amber-500', ring: 'border-amber-400/60 bg-amber-400/10 text-amber-600', bar: 'bg-amber-500' },
  cold: { text: 'text-sky-500', ring: 'border-sky-400/60 bg-sky-400/10 text-sky-500', bar: 'bg-sky-500' },
  freezing: { text: 'text-blue-500', ring: 'border-blue-400/60 bg-blue-400/10 text-blue-500', bar: 'bg-blue-500' },
};

export function NumberDuel() {
  const { locale } = useGamesLocale();
  const strings = useMemo(() => getNumberDuelStrings(locale), [locale]);
  const arcade = useMemo(() => getArcadeStrings(locale), [locale]);
  const { self, peer, players, connected, isSpectator } = useGameRoom();
  const { report } = useMatchReporter('number-duel');
  const reduced = usePrefersReducedMotion();

  const amHost = self?.role === 'host';

  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>(amHost ? 'setup' : 'waitingKeeper');
  const [secret, setSecret] = useState<number | null>(null);
  const [num, setNum] = useState(50);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [pending, setPending] = useState(false);
  const [counts, setCounts] = useState<{ 1?: number; 2?: number }>({});
  const [fireConfetti, setFireConfetti] = useState(false);

  const amKeeper = round === 1 ? amHost : !amHost;
  const meName = self?.name ?? strings.you;
  const peerName = peer?.name ?? strings.partner;
  // Round 1: host keeps. Round 2 swaps. Names for the read-only/spectator labels.
  const keeperName = round === 1 ? (amHost ? meName : peerName) : amHost ? peerName : meName;
  const guesserName = round === 1 ? (amHost ? peerName : meName) : amHost ? meName : peerName;

  const startRound = useCallback(
    (r: number) => {
      const keeper = r === 1 ? amHost : !amHost;
      setRound(r);
      setAttempts([]);
      setSecret(null);
      setNum(50);
      setPending(false);
      setFireConfetti(false);
      setPhase(keeper ? 'setup' : 'waitingKeeper');
    },
    [amHost],
  );

  const resetMatch = useCallback(() => {
    setCounts({});
    startRound(1);
  }, [startRound]);

  // Spectator-only mirror of the live game, rebuilt from keeper snapshots.
  const [spectate, setSpectate] = useState<{
    round: number;
    keeperName: string;
    guesserName: string;
    attempts: Attempt[];
  } | null>(null);

  const send = useGameChannel<Msg>((msg) => {
    switch (msg.kind) {
      case 'ready':
        // I'm the guesser this round; the keeper locked their number.
        if (!isSpectator && !amKeeper) {
          setPhase('guessing');
          playCue('go');
        }
        break;
      case 'guess': {
        if (isSpectator || !amKeeper || secret == null) return;
        const result = evaluateGuess(secret, msg.value);
        const heat = proximityBand(secret, msg.value);
        const frac = proximityFraction(secret, msg.value);
        const count = attempts.length + 1;
        const attempt: Attempt = { value: msg.value, result, heat, frac };
        const nextAttempts = [...attempts, attempt];
        setAttempts(nextAttempts);
        send({ kind: 'feedback', value: msg.value, result, heat, frac, count });
        // Keep spectators in sync with the freshly-added guess.
        send({ kind: 'snapshot', round, keeperName, guesserName, attempts: nextAttempts });
        if (result === 'correct') {
          setCounts((c) => ({ ...c, [round]: count }));
          setPhase('roundResult');
        }
        break;
      }
      case 'feedback': {
        if (isSpectator || amKeeper) return;
        setAttempts((a) => [...a, { value: msg.value, result: msg.result, heat: msg.heat, frac: msg.frac }]);
        setPending(false);
        if (msg.result === 'correct') {
          setCounts((c) => ({ ...c, [round]: msg.count }));
          setPhase('roundResult');
        } else {
          playCue(msg.heat === 'burning' || msg.heat === 'hot' ? 'select' : 'tick');
        }
        break;
      }
      case 'snapshot':
        // Only watchers consume snapshots; players own their own state.
        if (isSpectator) {
          setSpectate({
            round: msg.round,
            keeperName: msg.keeperName,
            guesserName: msg.guesserName,
            attempts: msg.attempts,
          });
        }
        break;
      case 'rematch':
        resetMatch();
        setSpectate(null);
        break;
    }
  });

  // Auto-advance out of the round recap into the next round or the summary.
  useEffect(() => {
    if (phase !== 'roundResult') return;
    const t = setTimeout(() => {
      if (round < TOTAL_ROUNDS) startRound(round + 1);
      else setPhase('over');
    }, ROUND_RECAP_MS);
    return () => clearTimeout(t);
  }, [phase, round, startRound]);

  const lockSecret = () => {
    const s = clampNumber(num);
    setSecret(s);
    setNum(50);
    setPhase('watching');
    playCue('select');
    send({ kind: 'ready' });
    send({ kind: 'snapshot', round, keeperName, guesserName, attempts: [] });
  };

  const submitGuess = useCallback(() => {
    if (pending || phase !== 'guessing') return;
    setPending(true);
    playCue('click');
    send({ kind: 'guess', value: clampNumber(num) });
  }, [pending, phase, num, send]);

  const rematch = () => {
    resetMatch();
    setSpectate(null);
    send({ kind: 'rematch' });
  };

  // ── Match reporting (host-authoritative, one-shot) ─────────────────────────
  const reportedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'over' || reportedRef.current) return;
    reportedRef.current = true;
    const host = players.find((p) => p.role === 'host');
    const guest = players.find((p) => p.role !== 'host');
    const hostCount = counts[2] ?? 0; // round 2: host guesses
    const guestCount = counts[1] ?? 0; // round 1: guest guesses
    const winner = decideWinner(hostCount, guestCount); // 'host' | 'guest' | 'draw'
    const roster = [];
    if (host) {
      roster.push({
        peerId: host.id,
        placement: winner === 'host' || winner === 'draw' ? 1 : 2,
        score: hostCount,
      });
    }
    if (guest) {
      roster.push({
        peerId: guest.id,
        placement: winner === 'guest' || winner === 'draw' ? 1 : 2,
        score: guestCount,
      });
    }
    if (roster.length > 0) void report(roster);
  }, [phase, players, counts, report]);

  // Reset the one-shot guard whenever a fresh match begins.
  useEffect(() => {
    if (phase !== 'over') reportedRef.current = false;
  }, [phase]);

  if (!connected) {
    return <WaitingForPeer message={arcade.waitingReconnect(peerName)} />;
  }

  // ── Spectator: clean read-only view following the live game ────────────────
  if (isSpectator) {
    return <SpectatorView strings={strings} snapshot={spectate} />;
  }

  return (
    <GameBody className="relative">
      <Confetti fire={fireConfetti} />
      <RoundHeader
        round={round}
        total={TOTAL_ROUNDS}
        amKeeper={amKeeper}
        peerName={peerName}
        phase={phase}
        strings={strings}
      />

      {phase === 'setup' && (
        <NumberPicker
          value={num}
          onChange={setNum}
          label={strings.pickSecret}
          cta={
            <TouchButton variant="primary" size="lg" icon={<Lock className="h-4 w-4" />} onClick={lockSecret}>
              {strings.lockItIn}
            </TouchButton>
          }
        />
      )}

      {phase === 'waitingKeeper' && (
        <Waiting text={strings.keeperThinking(peerName, MIN_NUMBER, MAX_NUMBER)} />
      )}

      {phase === 'watching' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius)] border border-edge bg-panel2 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-ink3">{strings.yourSecret}</p>
            <p className="font-mono text-4xl font-bold text-accent">{secret}</p>
          </div>
          <p className="text-center text-sm text-ink2">
            {strings.peerIsGuessing(peerName, attempts.length)}
          </p>
          <RangeBar attempts={attempts} />
          <AttemptList attempts={attempts} strings={strings} />
        </div>
      )}

      {phase === 'guessing' && (
        <GuessingPanel
          num={num}
          onChange={setNum}
          onSubmit={submitGuess}
          pending={pending}
          attempts={attempts}
          strings={strings}
          reduced={reduced}
        />
      )}

      {phase === 'roundResult' && (
        <RoundRecap
          justGuessed={!amKeeper}
          count={counts[round as 1 | 2]}
          peerName={peerName}
          strings={strings}
        />
      )}

      {phase === 'over' && (
        <Over
          amHost={amHost}
          counts={counts}
          peerName={peerName}
          onRematch={rematch}
          onWinFlourish={() => setFireConfetti(true)}
          strings={strings}
        />
      )}
    </GameBody>
  );
}

function RoundHeader({
  round,
  total,
  amKeeper,
  peerName,
  phase,
  strings,
}: {
  round: number;
  total: number;
  amKeeper: boolean;
  peerName: string;
  phase: Phase;
  strings: ReturnType<typeof getNumberDuelStrings>;
}) {
  if (phase === 'over') return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink3">
        {strings.roundOf(round, total)}
      </span>
      <TurnBadge tone={amKeeper ? 'peer' : 'you'}>
        {amKeeper ? strings.peerGuessing(peerName) : strings.youGuessing}
      </TurnBadge>
    </div>
  );
}

/** The guesser's active panel: number picker + turn timer + heat + range bar. */
function GuessingPanel({
  num,
  onChange,
  onSubmit,
  pending,
  attempts,
  strings,
  reduced,
}: {
  num: number;
  onChange: (n: number) => void;
  onSubmit: () => void;
  pending: boolean;
  attempts: Attempt[];
  strings: ReturnType<typeof getNumberDuelStrings>;
  reduced: boolean;
}) {
  // Per-guess soft timer. Resets on every new attempt; on expiry it auto-submits
  // whatever value is dialed so play never stalls.
  const [remaining, setRemaining] = useState(TURN_SECONDS);
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;
  const turnKey = attempts.length; // bumps each time feedback lands

  useEffect(() => {
    setRemaining(TURN_SECONDS);
    if (reduced) return; // honour reduced-motion: no ticking clock
    const started = Date.now();
    const id = setInterval(() => {
      const left = TURN_SECONDS - Math.floor((Date.now() - started) / 1000);
      if (left <= 0) {
        setRemaining(0);
        clearInterval(id);
        submitRef.current();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [turnKey, reduced]);

  const last = attempts[attempts.length - 1] ?? null;
  const timerTone = remaining <= 5 ? 'bad' : remaining <= 12 ? 'accent' : 'good';

  return (
    <div className="flex flex-col gap-4">
      <NumberPicker
        value={num}
        onChange={onChange}
        label={strings.yourGuess}
        aside={
          !reduced ? (
            <CountdownRing
              progress={remaining / TURN_SECONDS}
              size={44}
              tone={timerTone}
              label={String(remaining)}
            />
          ) : undefined
        }
        cta={
          <TouchButton variant="primary" size="lg" busy={pending} onClick={onSubmit}>
            {pending ? strings.checking : strings.guessCta(clampNumber(num))}
          </TouchButton>
        }
      >
        {last && last.result !== 'correct' && <HeatMeter attempt={last} strings={strings} />}
        <RangeBar attempts={attempts} dialed={clampNumber(num)} />
        <AttemptList attempts={attempts} strings={strings} />
      </NumberPicker>
    </div>
  );
}

/** Continuous hot/cold proximity meter for the guesser's latest attempt. */
function HeatMeter({
  attempt,
  strings,
}: {
  attempt: Attempt;
  strings: ReturnType<typeof getNumberDuelStrings>;
}) {
  const style = HEAT_STYLE[attempt.heat];
  return (
    <div className="rounded-[var(--radius)] border border-edge bg-panel p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-ink3">{strings.proximity}</span>
        <span className={cn('text-sm font-bold', style.text)}>{strings.heat[attempt.heat]}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel2">
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', style.bar)}
          style={{ width: `${Math.round(attempt.frac * 100)}%` }}
        />
      </div>
    </div>
  );
}

/** Shrinking visual range bar showing the interval the secret must still be in. */
function RangeBar({ attempts, dialed }: { attempts: Attempt[]; dialed?: number }) {
  const { min, max } = narrowedRange(attempts);
  const span = MAX_NUMBER - MIN_NUMBER;
  const left = ((min - MIN_NUMBER) / span) * 100;
  const width = ((max - min) / span) * 100;
  const marker = dialed != null ? ((clampNumber(dialed) - MIN_NUMBER) / span) * 100 : null;
  return (
    <div className="px-1">
      <div className="relative h-3 w-full rounded-full bg-panel2">
        <div
          className="absolute top-0 h-full rounded-full bg-accent/40 transition-all duration-300"
          style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
        />
        {marker != null && (
          <div
            className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
            style={{ left: `${marker}%` }}
            aria-hidden
          />
        )}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-ink3">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function NumberPicker({
  value,
  onChange,
  label,
  cta,
  aside,
  children,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  cta: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const set = (n: number) => onChange(clampNumber(n));
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--radius)] border border-edge bg-panel p-5">
        <div className="flex items-center justify-center gap-2">
          <p className="text-center text-xs uppercase tracking-wide text-ink3">{label}</p>
          {aside ? <span className="ml-auto">{aside}</span> : null}
        </div>
        <div className="mt-2 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => set(value - 1)}
            className="grid h-11 w-11 place-items-center rounded-full border border-edge text-ink2 active:scale-95"
            aria-label="minus one"
          >
            <Minus className="h-5 w-5" />
          </button>
          <span className="min-w-[3ch] text-center font-mono text-5xl font-bold tabular-nums text-accent">{value}</span>
          <button
            type="button"
            onClick={() => set(value + 1)}
            className="grid h-11 w-11 place-items-center rounded-full border border-edge text-ink2 active:scale-95"
            aria-label="plus one"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <input
          type="range"
          min={MIN_NUMBER}
          max={MAX_NUMBER}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          className="game-range mt-3 w-full"
          aria-label={label}
        />
      </div>
      {cta}
      {children}
    </div>
  );
}

/** Guess-count pips + the running feed of guesses, tinted by proximity heat. */
function AttemptList({
  attempts,
  strings,
}: {
  attempts: Attempt[];
  strings: ReturnType<typeof getNumberDuelStrings>;
}) {
  if (attempts.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1.5" aria-label={strings.guessCount(attempts.length)}>
        {attempts.map((_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-accent/70" />
        ))}
        <span className="ml-1 font-mono text-xs tabular-nums text-ink3">{strings.guessCount(attempts.length)}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {attempts.map((a, i) => {
          const heatRing = a.result === 'correct' ? 'border-good/50 bg-good/10 text-good' : HEAT_STYLE[a.heat].ring;
          return (
            <span
              key={i}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-sm',
                heatRing,
              )}
            >
              {a.value}
              {a.result === 'higher' && <ArrowUp className="h-3.5 w-3.5" />}
              {a.result === 'lower' && <ArrowDown className="h-3.5 w-3.5" />}
              {a.result === 'correct' && '✓'}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center text-ink3">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
      <p className="max-w-xs text-sm">{text}</p>
    </div>
  );
}

function RoundRecap({
  justGuessed,
  count,
  peerName,
  strings,
}: {
  justGuessed: boolean;
  count?: number;
  peerName: string;
  strings: ReturnType<typeof getNumberDuelStrings>;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-accent/40 bg-accentbg p-5 text-center">
      <p className="text-lg font-bold text-accent">
        {justGuessed ? strings.crackedIt(count ?? 0) : strings.peerNeeded(peerName, count ?? 0)}
      </p>
      <p className="mt-1 text-sm text-ink2">{strings.swappingRoles}</p>
    </div>
  );
}

function Over({
  amHost,
  counts,
  peerName,
  onRematch,
  onWinFlourish,
  strings,
}: {
  amHost: boolean;
  counts: { 1?: number; 2?: number };
  peerName: string;
  onRematch: () => void;
  onWinFlourish: () => void;
  strings: ReturnType<typeof getNumberDuelStrings>;
}) {
  const hostCount = counts[2] ?? 0;
  const guestCount = counts[1] ?? 0;
  const myCount = amHost ? hostCount : guestCount;
  const peerCount = amHost ? guestCount : hostCount;
  const winner = decideWinner(hostCount, guestCount);
  const tone = winner === 'draw' ? 'draw' : winner === (amHost ? 'host' : 'guest') ? 'win' : 'lose';

  // Fire win/lose polish exactly once as the summary mounts.
  useEffect(() => {
    if (tone === 'win') {
      onWinFlourish();
      playCue('win');
      hapticSuccess();
    } else if (tone === 'lose') {
      playCue('lose');
      hapticError();
    } else {
      playCue('draw');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <ResultBanner
        tone={tone}
        title={tone === 'win' ? strings.youWin : tone === 'lose' ? strings.peerWins(peerName) : strings.tie}
        detail={strings.matchSummary(myCount, peerCount, peerName)}
      />
      <TouchButton variant="primary" size="lg" onClick={onRematch}>
        {strings.playAgain}
      </TouchButton>
    </div>
  );
}

/** Read-only view for spectators: who's keeping/guessing + the live guess feed. */
function SpectatorView({
  snapshot,
  strings,
}: {
  snapshot: {
    round: number;
    keeperName: string;
    guesserName: string;
    attempts: Attempt[];
  } | null;
  strings: ReturnType<typeof getNumberDuelStrings>;
}) {
  return (
    <GameBody>
      <div className="flex flex-col items-center gap-2">
        <TurnBadge tone="wait">
          <Eye className="h-3.5 w-3.5" /> {strings.spectating}
        </TurnBadge>
        {snapshot && (
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink3">
            {strings.roundOf(snapshot.round, TOTAL_ROUNDS)}
          </span>
        )}
      </div>

      {!snapshot ? (
        <Waiting text={strings.keeperThinking(strings.partner, MIN_NUMBER, MAX_NUMBER)} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <SpectatorSeat name={snapshot.keeperName} sub={strings.spectatorSecretHidden} />
            <SpectatorSeat name={snapshot.guesserName} sub={strings.guessCount(snapshot.attempts.length)} accent />
          </div>
          <RangeBar attempts={snapshot.attempts} />
          <p className="text-center text-xs uppercase tracking-wide text-ink3">{strings.guessFeed}</p>
          <AttemptList attempts={snapshot.attempts} strings={strings} />
        </div>
      )}
    </GameBody>
  );
}

function SpectatorSeat({ name, sub, accent }: { name: string; sub: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-[var(--radius)] border p-4 text-center',
        accent ? 'border-accent/40 bg-accentbg' : 'border-edge bg-panel2',
      )}
    >
      <Avatar seed={name} name={name} size={36} />
      <span className={cn('truncate text-sm font-semibold', accent ? 'text-accent' : 'text-ink')}>{name}</span>
      <span className="text-xs text-ink3">{sub}</span>
    </div>
  );
}

export default NumberDuel;
