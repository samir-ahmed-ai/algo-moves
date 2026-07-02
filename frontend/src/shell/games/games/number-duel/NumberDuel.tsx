import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Lock, Minus, Plus } from 'lucide-react';
import { useGameRoom } from '../../net/useGameRoom';
import { useGameChannel } from '../../net/useGameChannel';
import { GameBody, ResultBanner, TouchButton, TurnBadge, WaitingForPeer } from '../../ui/gamesUi';
import {
  clampNumber,
  decideWinner,
  evaluateGuess,
  MAX_NUMBER,
  MIN_NUMBER,
  type GuessResult,
} from './logic';

type Attempt = { value: number; result: GuessResult };

type Msg =
  | { kind: 'ready' }
  | { kind: 'guess'; value: number }
  | { kind: 'feedback'; value: number; result: GuessResult; count: number }
  | { kind: 'rematch' };

// setup: keeper picks a secret · waitingKeeper: guesser waits · watching: keeper
// watches guesses · guessing: guesser guesses · roundResult: brief recap · over
type Phase = 'setup' | 'waitingKeeper' | 'watching' | 'guessing' | 'roundResult' | 'over';

const ROUND_RECAP_MS = 2600;

export function NumberDuel() {
  const { self, peer, connected } = useGameRoom();
  const amHost = self?.role === 'host';

  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>(amHost ? 'setup' : 'waitingKeeper');
  const [secret, setSecret] = useState<number | null>(null);
  const [num, setNum] = useState(50);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [pending, setPending] = useState(false);
  const [counts, setCounts] = useState<{ 1?: number; 2?: number }>({});

  const amKeeper = round === 1 ? amHost : !amHost;

  const startRound = useCallback(
    (r: number) => {
      const keeper = r === 1 ? amHost : !amHost;
      setRound(r);
      setAttempts([]);
      setSecret(null);
      setNum(50);
      setPending(false);
      setPhase(keeper ? 'setup' : 'waitingKeeper');
    },
    [amHost],
  );

  const resetMatch = useCallback(() => {
    setCounts({});
    startRound(1);
  }, [startRound]);

  const send = useGameChannel<Msg>((msg) => {
    switch (msg.kind) {
      case 'ready':
        // I'm the guesser this round; the keeper locked their number.
        if (!amKeeper) setPhase('guessing');
        break;
      case 'guess': {
        if (!amKeeper || secret == null) return;
        const result = evaluateGuess(secret, msg.value);
        const count = attempts.length + 1;
        setAttempts((a) => [...a, { value: msg.value, result }]);
        send({ kind: 'feedback', value: msg.value, result, count });
        if (result === 'correct') {
          setCounts((c) => ({ ...c, [round]: count }));
          setPhase('roundResult');
        }
        break;
      }
      case 'feedback': {
        if (amKeeper) return;
        setAttempts((a) => [...a, { value: msg.value, result: msg.result }]);
        setPending(false);
        if (msg.result === 'correct') {
          setCounts((c) => ({ ...c, [round]: msg.count }));
          setPhase('roundResult');
        }
        break;
      }
      case 'rematch':
        resetMatch();
        break;
    }
  });

  // Auto-advance out of the round recap.
  useEffect(() => {
    if (phase !== 'roundResult') return;
    const t = setTimeout(() => {
      if (round < 2) startRound(2);
      else setPhase('over');
    }, ROUND_RECAP_MS);
    return () => clearTimeout(t);
  }, [phase, round, startRound]);

  const lockSecret = () => {
    setSecret(num);
    setNum(50);
    setPhase('watching');
    send({ kind: 'ready' });
  };

  const submitGuess = () => {
    if (pending || phase !== 'guessing') return;
    setPending(true);
    send({ kind: 'guess', value: clampNumber(num) });
  };

  const rematch = () => {
    resetMatch();
    send({ kind: 'rematch' });
  };

  if (!connected) return <WaitingForPeer name={peer?.name} />;

  return (
    <GameBody>
      <RoundHeader round={round} amKeeper={amKeeper} peerName={peer?.name} phase={phase} />

      {phase === 'setup' && (
        <NumberPicker
          value={num}
          onChange={setNum}
          label="Pick a secret number"
          cta={
            <TouchButton variant="primary" size="lg" icon={<Lock className="h-4 w-4" />} onClick={lockSecret}>
              Lock it in
            </TouchButton>
          }
        />
      )}

      {phase === 'waitingKeeper' && (
        <Waiting text={`${peer?.name ?? 'Your partner'} is thinking of a number ${MIN_NUMBER}–${MAX_NUMBER}…`} />
      )}

      {phase === 'watching' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius)] border border-edge bg-panel2 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-ink3">Your secret</p>
            <p className="font-mono text-4xl font-bold text-accent">{secret}</p>
          </div>
          <p className="text-center text-sm text-ink2">
            {peer?.name ?? 'Your partner'} is guessing… {attempts.length} so far
          </p>
          <AttemptList attempts={attempts} />
        </div>
      )}

      {phase === 'guessing' && (
        <NumberPicker
          value={num}
          onChange={setNum}
          label="Your guess"
          cta={
            <TouchButton variant="primary" size="lg" busy={pending} onClick={submitGuess}>
              {pending ? 'Checking…' : `Guess ${clampNumber(num)}`}
            </TouchButton>
          }
        >
          <AttemptList attempts={attempts} />
        </NumberPicker>
      )}

      {phase === 'roundResult' && (
        <RoundRecap justGuessed={!amKeeper} count={counts[round as 1 | 2]} peerName={peer?.name} />
      )}

      {phase === 'over' && (
        <Over amHost={amHost} counts={counts} peerName={peer?.name} onRematch={rematch} />
      )}
    </GameBody>
  );
}

function RoundHeader({
  round,
  amKeeper,
  peerName,
  phase,
}: {
  round: number;
  amKeeper: boolean;
  peerName?: string;
  phase: Phase;
}) {
  if (phase === 'over') return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink3">Round {round} of 2</span>
      <TurnBadge tone={amKeeper ? 'peer' : 'you'}>
        {amKeeper ? `${peerName ?? 'Partner'} is guessing` : 'You are guessing'}
      </TurnBadge>
    </div>
  );
}

function NumberPicker({
  value,
  onChange,
  label,
  cta,
  children,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  cta: React.ReactNode;
  children?: React.ReactNode;
}) {
  const set = (n: number) => onChange(clampNumber(n));
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--radius)] border border-edge bg-panel p-5">
        <p className="text-center text-xs uppercase tracking-wide text-ink3">{label}</p>
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

function AttemptList({ attempts }: { attempts: Attempt[] }) {
  if (attempts.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {attempts.map((a, i) => (
        <span
          key={i}
          className={
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-sm ' +
            (a.result === 'correct'
              ? 'border-good/50 bg-good/10 text-good'
              : 'border-edge bg-panel2 text-ink2')
          }
        >
          {a.value}
          {a.result === 'higher' && <ArrowUp className="h-3.5 w-3.5" />}
          {a.result === 'lower' && <ArrowDown className="h-3.5 w-3.5" />}
          {a.result === 'correct' && '✓'}
        </span>
      ))}
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

function RoundRecap({ justGuessed, count, peerName }: { justGuessed: boolean; count?: number; peerName?: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-accent/40 bg-accentbg p-5 text-center">
      <p className="text-lg font-bold text-accent">
        {justGuessed ? `You cracked it in ${count}! 🎯` : `${peerName ?? 'Partner'} needed ${count} guesses`}
      </p>
      <p className="mt-1 text-sm text-ink2">Swapping roles…</p>
    </div>
  );
}

function Over({
  amHost,
  counts,
  peerName,
  onRematch,
}: {
  amHost: boolean;
  counts: { 1?: number; 2?: number };
  peerName?: string;
  onRematch: () => void;
}) {
  const hostCount = counts[2] ?? 0;
  const guestCount = counts[1] ?? 0;
  const myCount = amHost ? hostCount : guestCount;
  const peerCount = amHost ? guestCount : hostCount;
  const winner = decideWinner(hostCount, guestCount);
  const tone = winner === 'draw' ? 'draw' : winner === (amHost ? 'host' : 'guest') ? 'win' : 'lose';

  return (
    <div className="flex flex-col gap-4">
      <ResultBanner
        tone={tone}
        title={tone === 'win' ? '🏆 You win!' : tone === 'lose' ? `${peerName ?? 'Partner'} wins` : "It's a tie!"}
        detail={`You: ${myCount} guesses · ${peerName ?? 'Partner'}: ${peerCount} guesses`}
      />
      <TouchButton variant="primary" size="lg" onClick={onRematch}>
        Play again
      </TouchButton>
    </div>
  );
}

export default NumberDuel;
