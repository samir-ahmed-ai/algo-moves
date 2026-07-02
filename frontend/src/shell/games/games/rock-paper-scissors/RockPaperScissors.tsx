import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getArcadeStrings, useGamesLocale } from '../../locale';
import { useGameRoom } from '../../net/useGameRoom';
import { useGameChannel } from '../../net/useGameChannel';
import { useMatchReporter } from '../../net/useMatchReporter';
import { Avatar } from '../../ui/Avatar';
import { Confetti, CountdownRing } from '../../ui/effects';
import { usePrefersReducedMotion } from '../../ui/hooks';
import { ChoiceCard, GameBody, ResultBanner, TouchButton, TurnBadge, WaitingForPeer } from '../../ui/gamesUi';
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
  const lockedCount = Object.keys(roundPicks).filter((id) => roster.some((p) => p.id === id)).length;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const scoreThisRound = useCallback(() => {
    const picks = picksByRound[round] ?? {};
    // Only score seats still present so a dropout can't skew the field.
    const active: Record<string, Choice> = {};
    for (const p of roster) if (picks[p.id]) active[p.id] = picks[p.id];
    const roundPts = scoreRound(active);
    setScores((prev) => addRoundScores(prev, roundPts));
  }, [picksByRound, round, roster]);

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
      const done = isNPlayer ? npMatchOver(round + 1) : twoPlayerOver();
      if (done) {
        setPhase('over');
      } else {
        setRound((r) => r + 1);
        setMyPick(null);
        setPhase('pick');
      }
    }, REVEAL_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Two-player match end mirrors the original first-to-WIN_TARGET rule.
  const twoPlayerOver = useCallback(() => {
    if (!self || !peer) return false;
    return matchOver(scores[self.id] ?? 0, scores[peer.id] ?? 0);
  }, [self, peer, scores]);

  // Final placements + one-shot reporting + confetti on match over.
  const placements = useMemo(() => {
    const filled: Record<string, number> = {};
    for (const p of roster) filled[p.id] = scores[p.id] ?? 0;
    return matchPlacements(filled);
  }, [roster, scores]);

  const myPlacement = self ? placements.find((p) => p.id === self.id)?.placement ?? null : null;
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
    void report(
      placements.map((p) => ({ peerId: p.id, placement: p.placement, score: p.score })),
    );
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
        <Scoreboard roster={roster} scores={scores} selfId={self?.id} taunts={{}} />
        <ResultBanner tone={isSpectator ? 'draw' : iWon ? 'win' : 'lose'} title={title} detail={detail} />
        {!isSpectator ? (
          <TouchButton variant="primary" size="lg" onClick={rematch}>
            {strings.rematch}
          </TouchButton>
        ) : (
          <p className="text-center text-xs text-ink3">{strings.spectating}</p>
        )}
      </GameBody>
    );
  }

  // ---- Live round ----------------------------------------------------------
  const twoPlayerOutcome =
    !isNPlayer && self && peer && revealing && roundPicks[self.id] && roundPicks[peer.id]
      ? outcome(roundPicks[self.id], roundPicks[peer.id])
      : null;

  return (
    <GameBody className="relative">
      <Confetti fire={fireConfetti} />
      <Scoreboard roster={roster} scores={scores} selfId={self?.id} taunts={taunts} />
      <p className="text-center text-xs text-ink3">
        {isNPlayer ? strings.fieldOf(roster.length, NP_ROUNDS) : strings.bestOf(WIN_TARGET)}
        {' · '}
        {strings.roundLabel(round + 1, totalRounds)}
      </p>

      {/* Hands: 2-player keeps the classic duel; N-player shows the field. */}
      {isNPlayer ? (
        <div className="grid grid-cols-2 gap-3">
          {roster.map((p) => {
            const theirPick = roundPicks[p.id];
            const showFace = p.id === self?.id || revealing;
            return (
              <Hand
                key={p.id}
                label={p.id === self?.id ? strings.you : p.name}
                emoji={theirPick ? (showFace ? emojiFor(theirPick) : '🔒') : phase === 'countdown' ? '🔒' : '❔'}
                locked={!!theirPick}
                revealed={revealing}
                taunt={taunts[p.id]}
                reduced={reduced}
              />
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Hand
            label={self?.name ?? strings.you}
            emoji={myPick ? emojiFor(myPick) : '⏳'}
            locked={!!myPick}
            revealed
            taunt={self ? taunts[self.id] : undefined}
            reduced={reduced}
          />
          <Hand
            label={peer?.name ?? strings.partner}
            emoji={
              peer && roundPicks[peer.id]
                ? revealing
                  ? emojiFor(roundPicks[peer.id])
                  : '🔒'
                : '❔'
            }
            locked={!!(peer && roundPicks[peer.id])}
            revealed={revealing}
            taunt={peer ? taunts[peer.id] : undefined}
            reduced={reduced}
          />
        </div>
      )}

      {phase === 'countdown' ? (
        <div className="flex flex-col items-center gap-2">
          <CountdownRing progress={count / COUNTDOWN_SECS} size={64} tone="accent" label={String(count)} />
          <TurnBadge tone="wait">{strings.getReady}</TurnBadge>
        </div>
      ) : revealing ? (
        <div className="flex flex-col items-center gap-3">
          {twoPlayerOutcome ? (
            <p className="text-center text-lg font-bold">
              {twoPlayerOutcome === 'win'
                ? strings.youTakeIt
                : twoPlayerOutcome === 'lose'
                  ? strings.theyGotYou
                  : strings.tie}
            </p>
          ) : (
            <p className="text-center text-sm font-semibold text-ink2">{strings.roundLabel(round + 1, totalRounds)}</p>
          )}
          {!isSpectator ? (
            <TauntBar taunts={strings.taunts} onFling={flingTaunt} label={strings.sendTaunt} />
          ) : null}
        </div>
      ) : isSpectator ? (
        <div className="flex flex-col items-center gap-2">
          <TurnBadge tone="wait">{strings.spectating}</TurnBadge>
          <p className="text-xs text-ink3">{strings.waitingField(Math.max(0, roster.length - lockedCount))}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <TurnBadge tone={myPick ? 'wait' : 'you'}>
            {myPick ? (isNPlayer ? strings.waitingField(roster.length - lockedCount) : strings.lockedIn) : strings.makeMove}
          </TurnBadge>
          <div className="grid w-full grid-cols-3 gap-3">
            {CHOICES.map((c) => (
              <ChoiceCard key={c.id} selected={myPick === c.id} disabled={!!myPick} onClick={() => pick(c.id)}>
                <span className="text-4xl leading-none">{c.emoji}</span>
                <span className="text-xs font-semibold">{strings.choiceLabel[c.id]}</span>
              </ChoiceCard>
            ))}
          </div>
        </div>
      )}
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
    return (
      <div className="flex items-center justify-center gap-4 text-center">
        <PlayerScore player={a} score={scores[a?.id] ?? 0} isSelf={a?.id === selfId} />
        <span className="text-sm font-semibold text-ink3">vs</span>
        <PlayerScore player={b} score={scores[b?.id] ?? 0} isSelf={b?.id === selfId} align="right" muted />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {roster.map((p) => (
        <div
          key={p.id}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1',
            p.id === selfId ? 'border-accent/40 bg-accentbg' : 'border-edge bg-panel2',
          )}
        >
          <Avatar seed={p.id} name={p.name} size={20} />
          <span className="max-w-20 truncate text-xs font-semibold text-ink2">{p.name}</span>
          <span className="font-mono text-sm font-bold tabular-nums text-accent">{scores[p.id] ?? 0}</span>
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
      <div className="flex items-center gap-1.5" style={align === 'right' ? { justifyContent: 'flex-end' } : undefined}>
        {player ? <Avatar seed={player.id} name={player.name} size={22} ring={isSelf ? 'var(--accent)' : undefined} /> : null}
        <span className="truncate text-sm font-semibold text-ink">{player?.name ?? '—'}</span>
      </div>
      <div className={cn('font-mono text-3xl font-bold tabular-nums', muted ? 'text-ink2' : 'text-accent')}>{score}</div>
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
        'relative flex flex-col items-center gap-2 rounded-[var(--radius)] border p-4 transition-colors',
        revealed ? 'border-accent/40 bg-accentbg' : locked ? 'border-edge2 bg-panel2' : 'border-edge bg-panel',
      )}
    >
      {taunt ? (
        <span
          className={cn('absolute -top-2 right-1 text-2xl leading-none', !reduced && 'animate-bounce')}
          aria-hidden
        >
          {taunt}
        </span>
      ) : null}
      <span ref={emojiRef} className="text-5xl leading-none">
        {emoji}
      </span>
      <span className="truncate text-xs font-semibold text-ink2">{label}</span>
    </div>
  );
}

/** Row of one-tap taunt emojis flung during the reveal beat. */
function TauntBar({ taunts, onFling, label }: { taunts: string[]; onFling: (e: string) => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink3">{label}</span>
      <div className="flex gap-1.5">
        {taunts.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onFling(e)}
            className="grid h-9 w-9 place-items-center rounded-full border border-edge bg-panel text-lg transition-transform touch-manipulation hover:bg-panel2 active:scale-90"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export default RockPaperScissors;
