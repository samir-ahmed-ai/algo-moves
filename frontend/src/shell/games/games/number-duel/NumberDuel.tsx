import { useEffect } from 'react';
import { ArrowDown, ArrowUp, Eye, Loader2, Lock, Minus, Plus } from 'lucide-react';
import {
  GameBody,
  GameArena,
  ResultBanner,
  TouchButton,
  TurnBadge,
  WaitingForPeer,
} from '../../ui/gamesUi';
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
  burning: {
    text: 'text-red-600 dark:text-red-200',
    ring: 'border-red-300/45 bg-red-50/85 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-200',
    bar: 'bg-red-500',
  },
  hot: {
    text: 'text-orange-600 dark:text-orange-200',
    ring: 'border-orange-300/45 bg-orange-50/85 text-orange-700 dark:border-orange-300/20 dark:bg-orange-300/10 dark:text-orange-100',
    bar: 'bg-orange-500',
  },
  warm: {
    text: 'text-amber-700 dark:text-amber-200',
    ring: 'border-amber-300/45 bg-amber-50/85 text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100',
    bar: 'bg-amber-500',
  },
  cold: {
    text: 'text-sky-600 dark:text-sky-200',
    ring: 'border-sky-300/45 bg-sky-50/85 text-sky-700 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-100',
    bar: 'bg-sky-500',
  },
  freezing: {
    text: 'text-blue-600 dark:text-blue-200',
    ring: 'border-blue-300/45 bg-blue-50/85 text-blue-700 dark:border-blue-300/20 dark:bg-blue-300/10 dark:text-blue-100',
    bar: 'bg-blue-500',
  },
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
          {...(myCount !== undefined ? { myCount } : {})}
          {...(peerCount !== undefined ? { peerCount } : {})}
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
          <TouchButton
            variant="primary"
            size="md"
            className="w-full"
            icon={<Lock className="h-4 w-4" />}
            onClick={lockSecret}
          >
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
            <span className="text-[length:var(--fs-2xs)] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {strings.yourSecret}
            </span>
            <span className="rounded-full border border-indigo-300/45 bg-indigo-50/85 px-3 py-1 font-mono text-lg font-black tabular-nums text-indigo-700 shadow-sm dark:border-indigo-300/20 dark:bg-indigo-300/10 dark:text-indigo-100">
              {secret}
            </span>
          </div>
          <p className="text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
            {strings.peerIsGuessing(peerName, attempts.length)}
          </p>
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
          {...(counts[round as 1 | 2] !== undefined ? { count: counts[round as 1 | 2] } : {})}
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
    <div className="flex items-center justify-center gap-3 rounded-[1.5rem] border border-white/60 bg-white/72 p-3 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <ScoreCell
        name={meName}
        {...(myCount !== undefined ? { count: myCount } : {})}
        {...(myGuessing ? { active: myGuessing } : {})}
      />
      <div className="flex flex-col items-center gap-0.5">
        <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[length:var(--fs-2xs)] font-black uppercase tracking-wide text-white dark:bg-white dark:text-slate-950">
          vs
        </span>
        <span className="font-mono text-[length:var(--fs-2xs)] font-black tabular-nums text-slate-500 dark:text-slate-400">
          {round}/{total}
        </span>
      </div>
      <ScoreCell
        name={peerName}
        {...(peerCount !== undefined ? { count: peerCount } : {})}
        {...(peerGuessing ? { active: peerGuessing } : {})}
        muted
      />
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
      <div className="truncate text-xs font-bold text-slate-600 dark:text-slate-300">{name}</div>
      <div
        className={cn(
          'font-mono text-2xl font-black tabular-nums',
          muted ? 'text-slate-400' : 'text-cyan-700 dark:text-cyan-200',
        )}
      >
        {count ?? '—'}
      </div>
      {active ? (
        <span className="rounded-full border border-cyan-300/35 bg-cyan-50/85 px-2 py-0.5 text-[length:var(--fs-2xs)] font-black uppercase tracking-wide text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">
          live
        </span>
      ) : null}
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
      <span className="text-center text-[length:var(--fs-2xs)] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {strings.roundOf(round, total)}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-[length:var(--fs-2xs)] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
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
        <span className="text-[length:var(--fs-2xs)] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {strings.yourGuess}
        </span>
        {!reduced ? (
          <CountdownRing progress={progress} size={36} tone={timerTone} label={String(remaining)} />
        ) : (
          <span className="rounded-full bg-slate-950/5 px-2 py-1 font-mono text-xs font-black tabular-nums text-slate-500 dark:bg-white/10 dark:text-slate-400">
            {remaining}s
          </span>
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
      <span className="shrink-0 text-[length:var(--fs-2xs)] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {strings.proximity}
      </span>
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-950/10 shadow-inner dark:bg-white/10">
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', style.bar)}
          style={{ width: `${Math.round(attempt.frac * 100)}%` }}
        />
      </div>
      <span className={cn('shrink-0 text-xs font-black', style.text)}>
        {strings.heat[attempt.heat]}
      </span>
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
      <div className="relative h-2.5 w-full rounded-full bg-slate-950/10 shadow-inner dark:bg-white/10">
        <div
          className="absolute top-0 h-full rounded-full bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-500 transition-all duration-300"
          style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
        />
        {marker != null && (
          <div
            className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950 shadow-sm dark:bg-white"
            style={{ left: `${marker}%` }}
            aria-hidden
          />
        )}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[length:var(--fs-2xs)] font-black tabular-nums text-slate-500 dark:text-slate-400">
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
        <p className="mb-2 text-center text-[length:var(--fs-2xs)] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
      ) : null}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => set(value - 1)}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/60 bg-white/72 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="minus one"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[3ch] rounded-[1.25rem] border border-indigo-300/35 bg-indigo-50/85 px-4 py-2 text-center font-mono text-5xl font-black tabular-nums text-indigo-700 shadow-sm dark:border-indigo-300/20 dark:bg-indigo-300/10 dark:text-indigo-100">
          {value}
        </span>
        <button
          type="button"
          onClick={() => set(value + 1)}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/60 bg-white/72 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
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
        className="game-range mt-3 w-full accent-indigo-600"
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
      <span className="text-center text-[length:var(--fs-2xs)] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {strings.guessCount(attempts.length)}
      </span>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {attempts.map((a, i) => {
          const heatRing =
            a.result === 'correct'
              ? 'border-emerald-300/45 bg-emerald-100/80 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100'
              : HEAT_STYLE[a.heat].ring;
          return (
            <span
              key={i}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs font-black shadow-sm',
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
    <div className="flex flex-col items-center gap-2 rounded-[1.5rem] border border-white/60 bg-white/70 py-8 text-center text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin text-cyan-600 dark:text-cyan-200" />
      <p className="max-w-xs text-xs font-semibold">{text}</p>
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
    <div className="rounded-[1.5rem] border border-cyan-300/40 bg-cyan-50/85 px-4 py-4 text-center shadow-sm dark:border-cyan-300/20 dark:bg-cyan-300/10">
      <p className="text-base font-black text-cyan-800 dark:text-cyan-100">
        {justGuessed ? strings.crackedIt(count ?? 0) : strings.peerNeeded(peerName, count ?? 0)}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
        {strings.swappingRoles}
      </p>
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
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <ResultBanner
        tone={tone}
        title={
          tone === 'win'
            ? strings.youWin
            : tone === 'lose'
              ? strings.peerWins(peerName)
              : strings.tie
        }
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
          <span className="text-[length:var(--fs-2xs)] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
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
            <SpectatorSeat
              name={snapshot.guesserName}
              sub={strings.guessCount(snapshot.attempts.length)}
              accent
            />
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
        'flex flex-col items-center gap-1 rounded-[1.25rem] border px-2 py-2 text-center shadow-sm',
        accent
          ? 'border-indigo-300/45 bg-indigo-50/85 dark:border-indigo-300/20 dark:bg-indigo-300/10'
          : 'border-white/60 bg-white/70 dark:border-white/10 dark:bg-white/5',
      )}
    >
      <Avatar seed={name} name={name} size={28} />
      <span
        className={cn(
          'truncate text-xs font-black',
          accent ? 'text-indigo-700 dark:text-indigo-100' : 'text-slate-800 dark:text-slate-100',
        )}
      >
        {name}
      </span>
      <span className="text-[length:var(--fs-2xs)] font-medium text-slate-500 dark:text-slate-400">
        {sub}
      </span>
    </div>
  );
}

export default NumberDuel;
