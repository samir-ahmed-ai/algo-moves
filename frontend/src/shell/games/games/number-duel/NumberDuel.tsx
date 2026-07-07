import { useEffect } from 'react';
import { ArrowDown, ArrowUp, Eye, Loader2, Lock, Minus, Plus } from 'lucide-react';
import { GameBody, GameArena, ResultBanner, TouchButton, TurnBadge, WaitingForPeer } from '../../ui/gamesUi';
import { Confetti, CountdownRing } from '../../ui/effects';
import { usePrefersReducedMotion } from '../../ui/hooks';
import { Avatar } from '../../ui/Avatar';
import { cn } from '@/lib/utils/cn';
import { playCue } from '@/lib/utils/audio';
import { hapticError, hapticSuccess } from '@/lib/utils/haptic';
import {
  clampNumber,
  decideWinner,
  MAX_NUMBER,
  MIN_NUMBER,
  narrowedRange,
  type HeatLevel,
} from './logic';
import {
  ND_TOTAL_ROUNDS,
  ND_TURN_SECONDS,
  useNumberDuelGame,
  type Attempt,
} from './useNumberDuelGame';
import { useCountdown } from '../../engine';

const HEAT_STYLE: Record<HeatLevel, { text: string; ring: string; bar: string }> = {
  burning: { text: 'text-bad', ring: 'border-bad/60 bg-bad/10 text-bad', bar: 'bg-bad' },
  hot: { text: 'text-orange-500', ring: 'border-orange-400/60 bg-orange-400/10 text-orange-500', bar: 'bg-orange-500' },
  warm: { text: 'text-amber-500', ring: 'border-amber-400/60 bg-amber-400/10 text-amber-600', bar: 'bg-amber-500' },
  cold: { text: 'text-sky-500', ring: 'border-sky-400/60 bg-sky-400/10 text-sky-500', bar: 'bg-sky-500' },
  freezing: { text: 'text-blue-500', ring: 'border-blue-400/60 bg-blue-400/10 text-blue-500', bar: 'bg-blue-500' },
};

export function NumberDuel() {
  const vm = useNumberDuelGame();
  const {
    strings,
    arcade,
    connected,
    isSpectator,
    amHost,
    amKeeper,
    meName,
    peerName,
    round,
    phase,
    secret,
    num,
    setNum,
    attempts,
    pending,
    counts,
    fireConfetti,
    setFireConfetti,
    myCount,
    peerCount,
    lockSecret,
    submitGuess,
    rematch,
    spectatorSnapshot,
  } = vm;

  if (!connected && !isSpectator) {
    return <WaitingForPeer message={arcade.waitingReconnect(peerName)} />;
  }

  if (isSpectator) {
    return <SpectatorView strings={strings} snapshot={spectatorSnapshot} />;
  }

  const showScoreboard = phase !== 'over';
  const showPhaseHeader = phase !== 'over' && phase !== 'roundResult';

  return (
    <GameBody className="relative gap-3">
      <Confetti fire={fireConfetti} />

      {showScoreboard ? (
        <Scoreboard
          meName={meName}
          peerName={peerName}
          myCount={myCount}
          peerCount={peerCount}
          myGuessing={!amKeeper && phase !== 'waitingKeeper' && phase !== 'setup'}
          peerGuessing={amKeeper && phase === 'watching'}
          round={round}
          total={ND_TOTAL_ROUNDS}
        />
      ) : null}

      {showPhaseHeader ? (
        <PhaseHeader
          round={round}
          total={ND_TOTAL_ROUNDS}
          amKeeper={amKeeper}
          peerName={peerName}
          phase={phase}
          strings={strings}
        />
      ) : null}

      {phase === 'setup' && (
        <GameArena accent="#6366f1">
          <Dial value={num} onChange={setNum} label={strings.pickSecret} />
          <TouchButton variant="primary" size="md" className="w-full" icon={<Lock className="h-4 w-4" />} onClick={lockSecret}>
            {strings.lockItIn}
          </TouchButton>
        </GameArena>
      )}

      {phase === 'waitingKeeper' && (
        <WaitState text={strings.keeperThinking(peerName, MIN_NUMBER, MAX_NUMBER)} />
      )}

      {phase === 'watching' && (
        <GameArena accent="#6366f1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">{strings.yourSecret}</span>
            <span className="rounded-full border border-accent/40 bg-accentbg px-2.5 py-0.5 font-mono text-lg font-bold tabular-nums text-accent">
              {secret}
            </span>
          </div>
          <p className="text-center text-xs text-ink2">{strings.peerIsGuessing(peerName, attempts.length)}</p>
          <RangeTrack attempts={attempts} />
          <GuessLog attempts={attempts} strings={strings} />
        </GameArena>
      )}

      {phase === 'guessing' && (
        <GuessingArena
          num={num}
          onChange={setNum}
          onSubmit={submitGuess}
          pending={pending}
          attempts={attempts}
          strings={strings}
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

/** Head-to-head guess counts — filled after each round completes. */
function Scoreboard({
  meName,
  peerName,
  myCount,
  peerCount,
  myGuessing,
  peerGuessing,
  round,
  total,
}: {
  meName: string;
  peerName: string;
  myCount?: number;
  peerCount?: number;
  myGuessing?: boolean;
  peerGuessing?: boolean;
  round: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-center gap-3 text-center">
      <ScoreCell name={meName} count={myCount} active={myGuessing} />
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">vs</span>
        <span className="font-mono text-[length:var(--fs-2xs)] tabular-nums text-ink3">
          {round}/{total}
        </span>
      </div>
      <ScoreCell name={peerName} count={peerCount} active={peerGuessing} muted />
    </div>
  );
}

function ScoreCell({
  name,
  count,
  active,
  muted,
}: {
  name: string;
  count?: number;
  active?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="truncate text-xs font-semibold text-ink2">{name}</div>
      <div className={cn('font-mono text-2xl font-bold tabular-nums', muted ? 'text-ink3' : 'text-accent')}>
        {count ?? '—'}
      </div>
      {active ? <span className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-accent">live</span> : null}
    </div>
  );
}

function PhaseHeader({
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
  phase: ReturnType<typeof useNumberDuelGame>['phase'];
  strings: ReturnType<typeof useNumberDuelGame>['strings'];
}) {
  if (phase === 'waitingKeeper') {
    return (
      <span className="text-center text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-ink3">
        {strings.roundOf(round, total)}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-ink3">
        {strings.roundOf(round, total)}
      </span>
      <TurnBadge tone={amKeeper ? 'peer' : 'you'}>
        {amKeeper ? strings.peerGuessing(peerName) : strings.youGuessing}
      </TurnBadge>
    </div>
  );
}

function GuessingArena({
  num,
  onChange,
  onSubmit,
  pending,
  attempts,
  strings,
}: {
  num: number;
  onChange: (n: number) => void;
  onSubmit: () => void;
  pending: boolean;
  attempts: Attempt[];
  strings: ReturnType<typeof useNumberDuelGame>['strings'];
}) {
  const reduced = usePrefersReducedMotion();
  const { remaining, progress } = useCountdown(ND_TURN_SECONDS, {
    resetKey: attempts.length,
    skip: reduced,
    onExpire: onSubmit,
  });

  const last = attempts[attempts.length - 1] ?? null;
  const timerTone = remaining <= 5 ? 'bad' : remaining <= 12 ? 'accent' : 'good';

  return (
    <GameArena accent="#6366f1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">{strings.yourGuess}</span>
        {!reduced ? (
          <CountdownRing progress={progress} size={36} tone={timerTone} label={String(remaining)} />
        ) : (
          <span className="font-mono text-xs tabular-nums text-ink3">{remaining}s</span>
        )}
      </div>

      <RangeTrack attempts={attempts} dialed={clampNumber(num)} />
      <Dial value={num} onChange={onChange} />

      {last && last.result !== 'correct' ? <HeatStrip attempt={last} strings={strings} /> : null}
      <GuessLog attempts={attempts} strings={strings} />

      <TouchButton variant="primary" size="md" className="w-full" busy={pending} onClick={onSubmit}>
        {pending ? strings.checking : strings.guessCta(clampNumber(num))}
      </TouchButton>
    </GameArena>
  );
}

/** Continuous hot/cold proximity meter for the guesser's latest attempt. */
function HeatStrip({
  attempt,
  strings,
}: {
  attempt: Attempt;
  strings: ReturnType<typeof useNumberDuelGame>['strings'];
}) {
  const style = HEAT_STYLE[attempt.heat];
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">{strings.proximity}</span>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-panel2">
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', style.bar)}
          style={{ width: `${Math.round(attempt.frac * 100)}%` }}
        />
      </div>
      <span className={cn('shrink-0 text-xs font-bold', style.text)}>{strings.heat[attempt.heat]}</span>
    </div>
  );
}

function RangeTrack({ attempts, dialed }: { attempts: Attempt[]; dialed?: number }) {
  const { min, max } = narrowedRange(attempts);
  const span = MAX_NUMBER - MIN_NUMBER;
  const left = ((min - MIN_NUMBER) / span) * 100;
  const width = ((max - min) / span) * 100;
  const marker = dialed != null ? ((clampNumber(dialed) - MIN_NUMBER) / span) * 100 : null;
  return (
    <div>
      <div className="relative h-2 w-full rounded-full bg-panel2">
        <div
          className="absolute top-0 h-full rounded-full bg-accent/40 transition-all duration-300"
          style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
        />
        {marker != null && (
          <div
            className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
            style={{ left: `${marker}%` }}
            aria-hidden
          />
        )}
      </div>
      <div className="mt-0.5 flex justify-between font-mono text-[length:var(--fs-2xs)] tabular-nums text-ink3">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function Dial({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label?: string;
}) {
  const set = (n: number) => onChange(clampNumber(n));
  return (
    <div>
      {label ? (
        <p className="mb-1.5 text-center text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">{label}</p>
      ) : null}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => set(value - 1)}
          className="grid h-9 w-9 place-items-center rounded-full border border-edge text-ink2 active:scale-95"
          aria-label="minus one"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[3ch] text-center font-mono text-4xl font-bold tabular-nums text-accent">{value}</span>
        <button
          type="button"
          onClick={() => set(value + 1)}
          className="grid h-9 w-9 place-items-center rounded-full border border-edge text-ink2 active:scale-95"
          aria-label="plus one"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <input
        type="range"
        min={MIN_NUMBER}
        max={MAX_NUMBER}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="game-range mt-2 w-full"
        aria-label={label ?? 'number'}
      />
    </div>
  );
}

function GuessLog({
  attempts,
  strings,
}: {
  attempts: Attempt[];
  strings: ReturnType<typeof useNumberDuelGame>['strings'];
}) {
  if (attempts.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-center text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">
        {strings.guessCount(attempts.length)}
      </span>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {attempts.map((a, i) => {
          const heatRing = a.result === 'correct' ? 'border-good/50 bg-good/10 text-good' : HEAT_STYLE[a.heat].ring;
          return (
            <span
              key={i}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs',
                heatRing,
              )}
            >
              {a.value}
              {a.result === 'higher' && <ArrowUp className="h-3 w-3" />}
              {a.result === 'lower' && <ArrowDown className="h-3 w-3" />}
              {a.result === 'correct' && '✓'}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function WaitState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center text-ink3">
      <Loader2 className="h-5 w-5 animate-spin text-accent" />
      <p className="max-w-xs text-xs">{text}</p>
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
  strings: ReturnType<typeof useNumberDuelGame>['strings'];
}) {
  return (
    <div className="rounded-[var(--radius)] border border-accent/40 bg-accentbg px-4 py-3 text-center">
      <p className="text-base font-bold text-accent">
        {justGuessed ? strings.crackedIt(count ?? 0) : strings.peerNeeded(peerName, count ?? 0)}
      </p>
      <p className="mt-0.5 text-xs text-ink2">{strings.swappingRoles}</p>
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
  strings: ReturnType<typeof useNumberDuelGame>['strings'];
}) {
  const hostCount = counts[2] ?? 0;
  const guestCount = counts[1] ?? 0;
  const myCount = amHost ? hostCount : guestCount;
  const peerCount = amHost ? guestCount : hostCount;
  const winner = decideWinner(hostCount, guestCount);
  const tone = winner === 'draw' ? 'draw' : winner === (amHost ? 'host' : 'guest') ? 'win' : 'lose';

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
    <div className="flex flex-col gap-3">
      <ResultBanner
        tone={tone}
        title={tone === 'win' ? strings.youWin : tone === 'lose' ? strings.peerWins(peerName) : strings.tie}
        detail={strings.matchSummary(myCount, peerCount, peerName)}
      />
      <TouchButton variant="primary" size="md" className="w-full" onClick={onRematch}>
        {strings.playAgain}
      </TouchButton>
    </div>
  );
}

function SpectatorView({
  snapshot,
  strings,
}: {
  snapshot: ReturnType<typeof useNumberDuelGame>['spectatorSnapshot'];
  strings: ReturnType<typeof useNumberDuelGame>['strings'];
}) {
  return (
    <GameBody className="gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <TurnBadge tone="wait">
          <Eye className="h-3.5 w-3.5" /> {strings.spectating}
        </TurnBadge>
        {snapshot ? (
          <span className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-ink3">
            {strings.roundOf(snapshot.round, ND_TOTAL_ROUNDS)}
          </span>
        ) : null}
      </div>

      {!snapshot ? (
        <WaitState text={strings.keeperThinking(strings.partner, MIN_NUMBER, MAX_NUMBER)} />
      ) : (
        <GameArena accent="#6366f1">
          <div className="grid grid-cols-2 gap-2">
            <SpectatorSeat name={snapshot.keeperName} sub={strings.spectatorSecretHidden} />
            <SpectatorSeat name={snapshot.guesserName} sub={strings.guessCount(snapshot.attempts.length)} accent />
          </div>
          <RangeTrack attempts={snapshot.attempts} />
          <GuessLog attempts={snapshot.attempts} strings={strings} />
        </GameArena>
      )}
    </GameBody>
  );
}

function SpectatorSeat({ name, sub, accent }: { name: string; sub: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 rounded-[var(--radius)] border px-2 py-2 text-center',
        accent ? 'border-accent/40 bg-accentbg' : 'border-edge bg-panel2',
      )}
    >
      <Avatar seed={name} name={name} size={28} />
      <span className={cn('truncate text-xs font-semibold', accent ? 'text-accent' : 'text-ink')}>{name}</span>
      <span className="text-[length:var(--fs-2xs)] text-ink3">{sub}</span>
    </div>
  );
}

export default NumberDuel;
