import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getArcadeStrings, useGamesLocale } from '../../locale';
import { useGameRoom } from '../../net/useGameRoom';
import { useGameChannel } from '../../net/useGameChannel';
import { useMatchReporter } from '../../net/useMatchReporter';
import { Avatar } from '../../ui/Avatar';
import { Confetti, CountdownRing } from '../../ui/effects';
import { usePrefersReducedMotion } from '../../ui/hooks';
import {
  ChoiceCard,
  GameArena,
  GameBody,
  ResultBanner,
  TouchButton,
  TurnBadge,
  WaitingForPeer,
} from '../../ui/gamesUi';
import { hapticError, hapticSuccess } from '@/lib/utils/haptic';
import { playCue } from '@/lib/utils/audio';
import { cn } from '@/lib/utils/cn';
import {
  addRoundScores,
  CHOICES,
  matchOver,
  matchPlacements,
  NP_ROUNDS,
  npMatchOver,
  outcome,
  scoreRound,
  WIN_TARGET,
  type Choice,
} from './logic';
import { getRpsStrings } from './strings';

type RpsMsg =
  | { kind: 'pick'; round: number; choice: Choice }
  | { kind: 'taunt'; emoji: string }
  | { kind: 'rematch' };

type Phase = 'pick' | 'countdown' | 'reveal' | 'over';

/** Seconds the 3-2-1 countdown runs before hands are revealed. */
const COUNTDOWN_SECS = 3;
/** How long the revealed hands linger before the next round. */
const REVEAL_MS = 2000;
/** How long a taunt bubble floats over an opponent. */
const TAUNT_MS = 1600;

export function RockPaperScissors() {
  const { locale } = useGamesLocale();
  const strings = useMemo(() => getRpsStrings(locale), [locale]);
  const arcade = useMemo(() => getArcadeStrings(locale), [locale]);
  const reduced = usePrefersReducedMotion();

  const { self, peer, players, connected, isSpectator } = useGameRoom();
  const { report } = useMatchReporter('rock-paper-scissors');

  // Everyone holding a player seat, in stable seat order.
  const roster = players;
  const isNPlayer = roster.length > 2;

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('pick');
  const [myPick, setMyPick] = useState<Choice | null>(null);
  // Picks collected per round, keyed by round then peer id — every client
  // computes identical scores from the same relayed picks.
  const [picksByRound, setPicksByRound] = useState<Record<number, Record<string, Choice>>>({});
  // Running totals keyed by peer id (used for both 2p and N-player).
  const [scores, setScores] = useState<Record<string, number>>({});
  // Countdown value that ticks 3 → 2 → 1 before a reveal.
  const [count, setCount] = useState(COUNTDOWN_SECS);
  // Transient taunt bubbles keyed by the peer who flung them.
  const [taunts, setTaunts] = useState<Record<string, string>>({});
  const [fireConfetti, setFireConfetti] = useState(false);

  const reportedRef = useRef(false);
  const tauntTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const resetMatch = useCallback(() => {
    setRound(0);
    setPhase('pick');
    setMyPick(null);
    setPicksByRound({});
    setScores({});
    setCount(COUNTDOWN_SECS);
    setTaunts({});
    setFireConfetti(false);
    reportedRef.current = false;
  }, []);

  // Clear any pending taunt timers on unmount.
  useEffect(() => {
    const timers = tauntTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  const showTaunt = useCallback((id: string, emoji: string) => {
    setTaunts((prev) => ({ ...prev, [id]: emoji }));
    playCue('reaction');
    clearTimeout(tauntTimers.current[id]);
    tauntTimers.current[id] = setTimeout(() => {
      setTaunts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, TAUNT_MS);
  }, []);

  const send = useGameChannel<RpsMsg>((msg, fromId) => {
    if (msg.kind === 'pick') {
      setPicksByRound((prev) => ({
        ...prev,
        [msg.round]: { ...(prev[msg.round] ?? {}), [fromId]: msg.choice },
      }));
    } else if (msg.kind === 'taunt') {
      showTaunt(fromId, msg.emoji);
    } else if (msg.kind === 'rematch') {
      resetMatch();
    }
  });

  // Reset locale mid-game like Mind Meld, keeping every client aligned.
  const prevLocaleRef = useRef(locale);
  useEffect(() => {
    if (prevLocaleRef.current === locale) return;
    prevLocaleRef.current = locale;
    if (round === 0 && myPick === null && phase === 'pick') return;
    resetMatch();
    send({ kind: 'rematch' });
  }, [locale, round, myPick, phase, resetMatch, send]);

  // Picks for the active round, and how many active players have locked in.
  const roundPicks = picksByRound[round] ?? {};
  const lockedCount = Object.keys(roundPicks).filter((id) =>
    roster.some((p) => p.id === id),
  ).length;
  const allLockedIn = roster.length >= 2 && lockedCount >= roster.length;

  // Once every seat has thrown, count down before revealing.
  useEffect(() => {
    if (phase !== 'pick' || !allLockedIn) return;
    setCount(COUNTDOWN_SECS);
    setPhase('countdown');
  }, [phase, allLockedIn]);

  // 3-2-1 countdown, then flip to reveal and score the round.
  useEffect(() => {
    if (phase !== 'countdown') return;
    playCue('countdown');
    let n = COUNTDOWN_SECS;
    const tick = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(tick);
        playCue('go');
        scoreThisRound();
        setPhase('reveal');
      } else {
        setCount(n);
        playCue('countdown');
      }
    }, 700);
    return () => clearInterval(tick);
    // scoreThisRound closes over current round/picks; re-run only on phase change.
  }, [phase]);

  const scoreThisRound = useCallback(() => {
    const picks = picksByRound[round] ?? {};
    // Only score seats still present so a dropout can't skew the field.
    const active: Record<string, Choice> = {};
    for (const p of roster) {
      const pick = picks[p.id];
      if (pick) active[p.id] = pick;
    }
    const roundPts = scoreRound(active);
    setScores((prev) => addRoundScores(prev, roundPts));
  }, [picksByRound, round, roster]);

  const roundRef = useRef(round);
  roundRef.current = round;
  const scoresRef = useRef(scores);
  scoresRef.current = scores;

  // Feedback + auto-advance once a reveal has been shown for a beat.
  useEffect(() => {
    if (phase !== 'reveal') return;

    // Local win/lose feel for this round (2-player uses head-to-head outcome).
    if (self && peer && !isNPlayer) {
      const mine = roundPicks[self.id];
      const theirs = roundPicks[peer.id];
      if (mine && theirs) {
        const o = outcome(mine, theirs);
        if (o === 'win') hapticSuccess();
        else if (o === 'lose') hapticError();
      }
    }

    const t = setTimeout(() => {
      const done = isNPlayer
        ? npMatchOver(roundRef.current + 1)
        : matchOver(scoresRef.current[self?.id ?? ''] ?? 0, scoresRef.current[peer?.id ?? ''] ?? 0);
      if (done) {
        setPhase('over');
      } else {
        setRound((r) => r + 1);
        setMyPick(null);
        setPhase('pick');
      }
    }, REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase, self, peer, isNPlayer, roundPicks]);

  // Final placements + one-shot reporting + confetti on match over.
  const placements = useMemo(() => {
    const filled: Record<string, number> = {};
    for (const p of roster) filled[p.id] = scores[p.id] ?? 0;
    return matchPlacements(filled);
  }, [roster, scores]);

  const myPlacement = self ? (placements.find((p) => p.id === self.id)?.placement ?? null) : null;
  const iWon = myPlacement === 1;

  useEffect(() => {
    if (phase !== 'over') return;
    if (iWon && !isSpectator) {
      setFireConfetti(true);
      playCue('win');
      hapticSuccess();
    } else if (!isSpectator) {
      playCue('lose');
      hapticError();
    }
    if (reportedRef.current) return;
    reportedRef.current = true;
    void report(placements.map((p) => ({ peerId: p.id, placement: p.placement, score: p.score })));
  }, [phase, iWon, isSpectator, placements, report]);

  const pick = (c: Choice) => {
    if (isSpectator || myPick || phase !== 'pick' || !self) return;
    setMyPick(c);
    playCue('select');
    // Record locally too so single-client scoring never waits on our own relay.
    setPicksByRound((prev) => ({
      ...prev,
      [round]: { ...(prev[round] ?? {}), [self.id]: c },
    }));
    send({ kind: 'pick', round, choice: c });
  };

  const flingTaunt = (emoji: string) => {
    if (isSpectator || !self) return;
    showTaunt(self.id, emoji);
    send({ kind: 'taunt', emoji });
  };

  const rematch = () => {
    resetMatch();
    send({ kind: 'rematch' });
  };

  if (!connected && !isSpectator) {
    return <WaitingForPeer message={arcade.waitingReconnect(peer?.name ?? strings.partner)} />;
  }

  const emojiFor = (c: Choice) => CHOICES.find((x) => x.id === c)?.emoji ?? '❔';
  const revealing = phase === 'reveal';
  const totalRounds = isNPlayer ? NP_ROUNDS : WIN_TARGET * 2 - 1;

  // ---- Match over ----------------------------------------------------------
  if (phase === 'over') {
    const detail = placements
      .map((p) => `${roster.find((r) => r.id === p.id)?.name ?? '?'} ${p.score}`)
      .join(' · ');
    const winnerName = roster.find((r) => r.id === placements[0]?.id)?.name ?? strings.partner;
    const title = isSpectator
      ? strings.winnerIs(winnerName)
      : iWon
        ? isNPlayer
          ? strings.youWinField
          : strings.youWin
        : isNPlayer
          ? strings.placedNth(myPlacement ?? placements.length)
          : strings.peerWins(peer?.name ?? strings.partner);
    return (
      <GameBody className="relative">
        <Confetti fire={fireConfetti} />
        <Scoreboard
          roster={roster}
          scores={scores}
          {...(self?.id !== undefined ? { selfId: self.id } : {})}
          taunts={{}}
        />
        <ResultBanner
          tone={isSpectator ? 'draw' : iWon ? 'win' : 'lose'}
          title={title}
          detail={detail}
        />
        {!isSpectator ? (
          <TouchButton variant="primary" size="md" className="w-full" onClick={rematch}>
            {strings.rematch}
          </TouchButton>
        ) : (
          <p className="rounded-2xl border border-white/60 bg-white/64 px-3 py-3 text-center text-xs font-semibold text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            {strings.spectating}
          </p>
        )}
      </GameBody>
    );
  }

  // ---- Live round ----------------------------------------------------------
  const myRoundPick = self ? roundPicks[self.id] : undefined;
  const peerRoundPick = peer ? roundPicks[peer.id] : undefined;
  const twoPlayerOutcome =
    !isNPlayer && myRoundPick && peerRoundPick ? outcome(myRoundPick, peerRoundPick) : null;

  return (
    <GameBody className="relative gap-2.5">
      <Confetti fire={fireConfetti} />
      <Scoreboard
        roster={roster}
        scores={scores}
        {...(self?.id !== undefined ? { selfId: self.id } : {})}
        taunts={taunts}
      />
      <p className="text-center text-[length:var(--fs-2xs)] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {isNPlayer ? strings.fieldOf(roster.length, NP_ROUNDS) : strings.bestOf(WIN_TARGET)}
        {' · '}
        {strings.roundLabel(round + 1, totalRounds)}
      </p>

      <GameArena accent="#f59e0b">
        {isNPlayer ? (
          <div className="grid grid-cols-2 gap-2">
            {roster.map((p) => {
              const theirPick = roundPicks[p.id];
              const showFace = p.id === self?.id || revealing;
              return (
                <Hand
                  key={p.id}
                  label={p.id === self?.id ? strings.you : p.name}
                  emoji={
                    theirPick
                      ? showFace
                        ? emojiFor(theirPick)
                        : '🔒'
                      : phase === 'countdown'
                        ? '🔒'
                        : '❔'
                  }
                  locked={!!theirPick}
                  revealed={revealing}
                  {...(taunts[p.id] !== undefined ? { taunt: taunts[p.id] } : {})}
                  reduced={reduced}
                />
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Hand
              label={self?.name ?? strings.you}
              emoji={myPick ? emojiFor(myPick) : '⏳'}
              locked={!!myPick}
              revealed
              {...(self && taunts[self.id] !== undefined ? { taunt: taunts[self.id] } : {})}
              reduced={reduced}
            />
            <Hand
              label={peer?.name ?? strings.partner}
              emoji={peerRoundPick ? (revealing ? emojiFor(peerRoundPick) : '🔒') : '❔'}
              locked={!!peerRoundPick}
              revealed={revealing}
              {...(peer && taunts[peer.id] !== undefined ? { taunt: taunts[peer.id] } : {})}
              reduced={reduced}
            />
          </div>
        )}

        {phase === 'countdown' ? (
          <div className="flex flex-col items-center gap-1.5">
            <CountdownRing
              progress={count / COUNTDOWN_SECS}
              size={44}
              tone="accent"
              label={String(count)}
            />
            <TurnBadge tone="wait">{strings.getReady}</TurnBadge>
          </div>
        ) : revealing ? (
          <div className="flex flex-col items-center gap-2">
            {twoPlayerOutcome ? (
              <p className="rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-center text-sm font-black text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
                {twoPlayerOutcome === 'win'
                  ? strings.youTakeIt
                  : twoPlayerOutcome === 'lose'
                    ? strings.theyGotYou
                    : strings.tie}
              </p>
            ) : (
              <p className="text-center text-sm font-bold text-slate-600 dark:text-slate-300">
                {strings.roundLabel(round + 1, totalRounds)}
              </p>
            )}
            {!isSpectator ? (
              <TauntBar taunts={strings.taunts} onFling={flingTaunt} label={strings.sendTaunt} />
            ) : null}
          </div>
        ) : isSpectator ? (
          <div className="flex flex-col items-center gap-2">
            <TurnBadge tone="wait">{strings.spectating}</TurnBadge>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {strings.waitingField(Math.max(0, roster.length - lockedCount))}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <TurnBadge tone={myPick ? 'wait' : 'you'}>
              {myPick
                ? isNPlayer
                  ? strings.waitingField(roster.length - lockedCount)
                  : strings.lockedIn
                : strings.makeMove}
            </TurnBadge>
            <div className="grid w-full grid-cols-3 gap-1.5">
              {CHOICES.map((c) => (
                <ChoiceCard
                  key={c.id}
                  selected={myPick === c.id}
                  disabled={!!myPick}
                  onClick={() => pick(c.id)}
                >
                  <span className="text-2xl leading-none">{c.emoji}</span>
                  <span className="text-[length:var(--fs-2xs)] font-black">
                    {strings.choiceLabel[c.id]}
                  </span>
                </ChoiceCard>
              ))}
            </div>
          </div>
        )}
      </GameArena>
    </GameBody>
  );
}

/** Compact per-player score row with avatars — scales from 2 up to capacity. */
function Scoreboard({
  roster,
  scores,
  selfId,
  taunts,
}: {
  roster: { id: string; name: string }[];
  scores: Record<string, number>;
  selfId?: string;
  taunts: Record<string, string>;
}) {
  if (roster.length <= 2) {
    const [a, b] = roster;
    const aId = a?.id;
    const bId = b?.id;
    return (
      <div className="flex items-center justify-center gap-3 rounded-[1.5rem] border border-white/60 bg-white/72 p-3 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <PlayerScore
          {...(a !== undefined ? { player: a } : {})}
          score={aId ? (scores[aId] ?? 0) : 0}
          isSelf={aId === selfId}
        />
        <span className="rounded-full bg-slate-950 px-2 py-0.5 text-xs font-black text-white dark:bg-white dark:text-slate-950">
          vs
        </span>
        <PlayerScore
          {...(b !== undefined ? { player: b } : {})}
          score={bId ? (scores[bId] ?? 0) : 0}
          isSelf={bId === selfId}
          align="right"
          muted
        />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {roster.map((p) => (
        <div
          key={p.id}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-sm backdrop-blur',
            p.id === selfId
              ? 'border-cyan-300/45 bg-cyan-50/85 dark:border-cyan-300/20 dark:bg-cyan-300/10'
              : 'border-white/60 bg-white/70 dark:border-white/10 dark:bg-white/5',
          )}
        >
          <Avatar seed={p.id} name={p.name} size={20} />
          <span className="max-w-20 truncate text-xs font-bold text-slate-700 dark:text-slate-200">
            {p.name}
          </span>
          <span className="font-mono text-sm font-black tabular-nums text-cyan-700 dark:text-cyan-200">
            {scores[p.id] ?? 0}
          </span>
          {taunts[p.id] ? <span className="text-sm leading-none">{taunts[p.id]}</span> : null}
        </div>
      ))}
    </div>
  );
}

function PlayerScore({
  player,
  score,
  isSelf,
  align,
  muted,
}: {
  player?: { id: string; name: string };
  score: number;
  isSelf?: boolean;
  align?: 'left' | 'right';
  muted?: boolean;
}) {
  return (
    <div className={cn('min-w-0 flex-1', align === 'right' && 'text-right')}>
      <div
        className="flex items-center gap-1.5"
        style={align === 'right' ? { justifyContent: 'flex-end' } : undefined}
      >
        {player ? (
          <Avatar
            seed={player.id}
            name={player.name}
            size={22}
            {...(isSelf ? { ring: '#0891b2' } : {})}
          />
        ) : null}
        <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
          {player?.name ?? '—'}
        </span>
      </div>
      <div
        className={cn(
          'font-mono text-xl font-black tabular-nums',
          muted ? 'text-slate-600 dark:text-slate-300' : 'text-cyan-700 dark:text-cyan-200',
        )}
      >
        {score}
      </div>
    </div>
  );
}

function Hand({
  label,
  emoji,
  locked,
  revealed,
  taunt,
  reduced,
}: {
  label: string;
  emoji: string;
  locked: boolean;
  revealed: boolean;
  taunt?: string;
  reduced: boolean;
}) {
  const emojiRef = useRef<HTMLSpanElement>(null);

  // Pop the hand when it flips to its revealed face (WAAPI, no global CSS).
  useEffect(() => {
    if (!revealed || reduced) return;
    emojiRef.current?.animate(
      [
        { transform: 'scale(0.6) rotate(-12deg)', opacity: 0.4 },
        { transform: 'scale(1.15) rotate(4deg)', opacity: 1, offset: 0.6 },
        { transform: 'scale(1) rotate(0deg)', opacity: 1 },
      ],
      { duration: 320, easing: 'cubic-bezier(0.2,0.7,0.2,1)' },
    );
  }, [revealed, emoji, reduced]);

  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-[1.35rem] border p-3 shadow-sm backdrop-blur transition',
        revealed
          ? 'border-amber-300/45 bg-amber-50/85 shadow-[0_14px_34px_rgba(245,158,11,0.14)] dark:border-amber-300/20 dark:bg-amber-300/10'
          : locked
            ? 'border-white/60 bg-white/70 dark:border-white/10 dark:bg-white/5'
            : 'border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/[0.03]',
      )}
    >
      {taunt ? (
        <span
          className={cn(
            'absolute -top-2 right-1 text-2xl leading-none',
            !reduced && 'animate-bounce',
          )}
          aria-hidden
        >
          {taunt}
        </span>
      ) : null}
      <span ref={emojiRef} className="text-4xl leading-none drop-shadow-sm">
        {emoji}
      </span>
      <span className="truncate text-xs font-black text-slate-700 dark:text-slate-200">
        {label}
      </span>
    </div>
  );
}

/** Row of one-tap taunt emojis flung during the reveal beat. */
function TauntBar({
  taunts,
  onFling,
  label,
}: {
  taunts: string[];
  onFling: (e: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[length:var(--fs-2xs)] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className="flex gap-1.5">
        {taunts.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onFling(e)}
            className="grid h-9 w-9 touch-manipulation place-items-center rounded-full border border-white/60 bg-white/72 text-lg shadow-sm transition hover:-translate-y-0.5 hover:bg-white active:scale-90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export default RockPaperScissors;
