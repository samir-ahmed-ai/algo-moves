import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getArcadeStrings, useGamesLocale } from '../../locale';
import { useGameRoom } from '../../net/useGameRoom';
import { useGameChannel } from '../../net/useGameChannel';
import { useMatchReporter } from '../../net/useMatchReporter';
import type { Peer } from '../../net/protocol';
import { Avatar } from '../../ui/Avatar';
import { Confetti, CountdownRing } from '../../ui/effects';
import { usePrefersReducedMotion } from '../../ui/hooks';
import { ChoiceCard, GameBody, ResultBanner, TouchButton, TurnBadge, WaitingForPeer } from '../../ui/gamesUi';
import { playCue } from '@/lib/utils/audio';
import { hapticError, hapticSuccess } from '@/lib/utils/haptic';
import { cn } from '@/lib/utils/cn';
import {
  compatibilityKey,
  compatibilityKeyFromRatio,
  groupSyncPercent,
  isMatch,
  pluralityAgreement,
  type MeldChoice,
} from './logic';
import { getMeldPrompts, type MeldPrompt } from './prompts';
import { getMindMeldStrings } from './strings';

/** Wire messages. Players relay picks; the host relays a rematch reset. */
type MeldMsg = { kind: 'answer'; round: number; choice: MeldChoice } | { kind: 'rematch' };

type Phase = 'answer' | 'reveal' | 'over';

/**
 * Host-authoritative game state, mirrored to every client (players + late
 * joiners + spectators) via publishState. `answers[round][peerId] = choice`.
 */
interface MeldState {
  round: number;
  phase: Phase;
  /** Epoch ms when the answer window closes; null outside the answer phase. */
  deadline: number | null;
  answers: Record<number, Record<string, MeldChoice>>;
}

const REVEAL_MS = 2200;
const ROUND_MS = 12000;

function freshState(): MeldState {
  return { round: 0, phase: 'answer', deadline: null, answers: {} };
}

/** Picks for one round, ordered to match the player roster. */
function roundPicks(state: MeldState, round: number, players: Peer[]): (MeldChoice | null)[] {
  const row = state.answers[round] ?? {};
  return players.map((p) => (p.id in row ? row[p.id] : null));
}

export function MindMeld() {
  const { locale } = useGamesLocale();
  const strings = useMemo(() => getMindMeldStrings(locale), [locale]);
  const arcade = useMemo(() => getArcadeStrings(locale), [locale]);
  const prompts = useMemo(() => getMeldPrompts(locale), [locale]);
  const total = prompts.length;

  const { self, peer, players, connected, role, isSpectator, publishState, sharedState } = useGameRoom();
  const { report } = useMatchReporter('mind-meld');

  const isHost = role === 'host';
  const isGroup = players.length > 2;

  // The host owns `state` locally and publishes it; guests/spectators read it
  // from sharedState. publishState also updates the host's own copy, so a single
  // `state` value is the source of truth on every client.
  const [state, setState] = useState<MeldState>(freshState);

  // Adopt any inbound shared state (guests + spectators, and the host's own echo).
  useEffect(() => {
    if (sharedState && typeof sharedState === 'object' && 'phase' in (sharedState as object)) {
      setState(sharedState as MeldState);
    }
  }, [sharedState]);

  // Only the host writes shared state — done in an effect below, never during
  // render — so a single local setState keeps the two paths symmetric.
  const commit = useCallback((next: MeldState) => {
    setState(next);
  }, []);

  // Host mirrors authoritative state to the room whenever it changes.
  useEffect(() => {
    if (isHost) publishState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isHost]);

  const resetMatch = useCallback(() => {
    commit(freshState());
  }, [commit]);

  // Record a pick. Host applies it straight to authoritative state; guests relay
  // it up and optimistically show their own selection.
  const recordAnswer = useCallback(
    (round: number, peerId: string, choice: MeldChoice) => {
      setState((prev) => {
        if (prev.phase !== 'answer' || round !== prev.round) return prev;
        const row = prev.answers[round] ?? {};
        if (peerId in row) return prev; // one pick per player per round
        const next: MeldState = {
          ...prev,
          answers: { ...prev.answers, [round]: { ...row, [peerId]: choice } },
        };
        return next;
      });
    },
    [],
  );

  const send = useGameChannel<MeldMsg>((msg, fromId) => {
    if (msg.kind === 'answer') {
      recordAnswer(msg.round, fromId, msg.choice);
    } else if (msg.kind === 'rematch') {
      // Non-hosts follow the host's reset even before its state echo lands.
      if (!isHost) setState(freshState());
    }
  });

  // Reset when locale changes mid-game so prompt text stays aligned with round
  // state. Only the host re-broadcasts, to avoid a reset storm.
  const prevLocaleRef = useRef(locale);
  useEffect(() => {
    if (prevLocaleRef.current === locale) return;
    prevLocaleRef.current = locale;
    const untouched = state.round === 0 && state.phase === 'answer' && Object.keys(state.answers).length === 0;
    if (untouched) return;
    if (isHost) {
      resetMatch();
      send({ kind: 'rematch' });
    }
  }, [locale, state, isHost, resetMatch, send]);

  const myId = self?.id ?? '';
  const myPick: MeldChoice | null =
    myId && myId in (state.answers[state.round] ?? {}) ? state.answers[state.round][myId] : null;

  // --- Host: open a fresh answer window whenever we enter the answer phase.
  useEffect(() => {
    if (!isHost) return;
    if (state.phase !== 'answer' || state.deadline !== null) return;
    commit({ ...state, deadline: Date.now() + ROUND_MS });
  }, [isHost, state, commit]);

  // --- Host: flip to reveal once every player has answered, or when time runs
  // out. Runs on a light interval so the deadline is enforced even if idle.
  useEffect(() => {
    if (!isHost || state.phase !== 'answer') return;
    const tryAdvance = () => {
      const row = state.answers[state.round] ?? {};
      const everyone = players.length > 0 && players.every((p) => p.id in row);
      const expired = state.deadline !== null && Date.now() >= state.deadline;
      if (everyone || expired) {
        commit({ ...state, phase: 'reveal', deadline: null });
      }
    };
    tryAdvance();
    const id = setInterval(tryAdvance, 250);
    return () => clearInterval(id);
  }, [isHost, state, players, commit]);

  // --- Host: hold the reveal for a beat, then advance or end the match.
  useEffect(() => {
    if (!isHost || state.phase !== 'reveal') return;
    const t = setTimeout(() => {
      if (state.round + 1 >= total) {
        commit({ ...state, phase: 'over', deadline: null });
      } else {
        commit({ ...state, round: state.round + 1, phase: 'answer', deadline: null });
      }
    }, REVEAL_MS);
    return () => clearTimeout(t);
  }, [isHost, state, total, commit]);

  // --- Countdown ring progress (all clients derive it from the shared deadline).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state.phase !== 'answer' || state.deadline === null) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [state.phase, state.deadline]);
  const remainingMs = state.deadline !== null ? Math.max(0, state.deadline - now) : ROUND_MS;
  const timerProgress = state.deadline !== null ? remainingMs / ROUND_MS : 1;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  // --- Per-round sound + haptic feedback on reveal (fires once per round).
  const revealedRoundRef = useRef(-1);
  useEffect(() => {
    if (state.phase !== 'reveal' || revealedRoundRef.current === state.round) return;
    revealedRoundRef.current = state.round;
    const picks = roundPicks(state, state.round, players);
    const synced = isGroup
      ? pluralityAgreement(picks) >= 0.75
      : picks.length >= 2 && picks[0] !== null && picks[0] === picks[1];
    if (synced) {
      playCue('select');
      hapticSuccess();
    } else {
      playCue('tick');
    }
  }, [state, players, isGroup]);
  // Re-arm the reveal detector when a new answer window opens.
  useEffect(() => {
    if (state.phase === 'answer') revealedRoundRef.current = -1;
  }, [state.phase]);

  // --- Scores. Two-player keeps the original matched-count; groups use sync %.
  const matchedCount = useMemo(() => {
    let n = 0;
    for (let r = 0; r <= Math.min(state.round, total - 1); r++) {
      if (state.phase === 'answer' && r === state.round) continue; // not revealed yet
      const picks = roundPicks(state, r, players);
      if (picks.length >= 2 && picks[0] !== null && picks[1] !== null && isMatch(picks[0], picks[1])) n++;
    }
    return n;
  }, [state, players, total]);

  const revealedRounds = useMemo(() => {
    const rows: (MeldChoice | null)[][] = [];
    const last = state.phase === 'over' ? total - 1 : state.phase === 'reveal' ? state.round : state.round - 1;
    for (let r = 0; r <= last; r++) rows.push(roundPicks(state, r, players));
    return rows;
  }, [state, players, total]);

  const syncPercent = useMemo(() => groupSyncPercent(revealedRounds), [revealedRounds]);

  // History of in-sync prompts (matched in 2-player, high plurality in groups).
  const history = useMemo(() => {
    const items: { round: number; label: string }[] = [];
    revealedRounds.forEach((picks, r) => {
      const synced = isGroup
        ? pluralityAgreement(picks) >= 0.75
        : picks.length >= 2 && picks[0] !== null && picks[0] === picks[1];
      if (synced) items.push({ round: r, label: prompts[r]?.q ?? '' });
    });
    return items;
  }, [revealedRounds, prompts, isGroup]);

  const answer = (c: MeldChoice) => {
    if (isSpectator || myPick !== null || state.phase !== 'answer') return;
    playCue('click');
    if (isHost) {
      recordAnswer(state.round, myId, c);
    } else {
      // Optimistically show our own pick, then let the host's echo confirm it.
      setState((prev) => {
        if (prev.phase !== 'answer') return prev;
        const row = prev.answers[prev.round] ?? {};
        return { ...prev, answers: { ...prev.answers, [prev.round]: { ...row, [myId]: c } } };
      });
      send({ kind: 'answer', round: state.round, choice: c });
    }
  };

  const rematch = () => {
    if (!isHost) return;
    playCue('click');
    resetMatch();
    send({ kind: 'rematch' });
  };

  // --- Match reporting (cooperative): report once when the match ends.
  const reportedRef = useRef(false);
  useEffect(() => {
    if (state.phase !== 'over') {
      reportedRef.current = false;
      return;
    }
    if (reportedRef.current) return;
    reportedRef.current = true;
    const finalSync = isGroup ? syncPercent : total > 0 ? Math.round((matchedCount / total) * 100) : 0;
    // Cooperative: everyone shares placement 1, scored by the group's sync %.
    void report(
      players.map((p) => ({ peerId: p.id, placement: 1, score: finalSync })),
      { metadata: { sync: finalSync } },
    );
  }, [state.phase, isGroup, syncPercent, matchedCount, total, players, report]);

  const reduced = usePrefersReducedMotion();

  if (!connected) {
    return <WaitingForPeer message={arcade.waitingReconnect(peer?.name ?? strings.partner)} />;
  }

  const peerName = peer?.name ?? strings.partner;

  // ---- End-of-match summary. ----
  if (state.phase === 'over') {
    const ratio = isGroup ? syncPercent / 100 : total > 0 ? matchedCount / total : 0;
    const finalSync = Math.round(ratio * 100);
    const labelKey = isGroup ? compatibilityKeyFromRatio(ratio) : compatibilityKey(matchedCount, total);
    return (
      <GameBody>
        <Confetti fire={ratio >= 0.8} />
        <MatchSummaryEffects ratio={ratio} reduced={reduced} />
        <Progress
          state={state}
          total={total}
          isGroup={isGroup}
          matchedCount={matchedCount}
          syncPercent={syncPercent}
          strings={strings}
        />
        <ResultBanner
          tone={ratio >= 0.8 ? 'win' : ratio >= 0.5 ? 'draw' : 'lose'}
          title={isGroup ? strings.groupSyncTitle(finalSync) : strings.inSyncTitle(matchedCount, total)}
          detail={strings.compatibility[labelKey]}
        />
        <HistoryList history={history} strings={strings} />
        {isHost ? (
          <TouchButton variant="primary" size="lg" onClick={rematch}>
            {strings.playAgain}
          </TouchButton>
        ) : (
          <p className="text-center text-sm text-ink3">{strings.spectatorWaiting}</p>
        )}
      </GameBody>
    );
  }

  const prompt = prompts[state.round];
  const options: { choice: MeldChoice; label: string }[] = [
    { choice: 0, label: prompt.a },
    { choice: 1, label: prompt.b },
  ];

  const picks = roundPicks(state, state.round, players);
  const answeredCount = picks.filter((p) => p !== null).length;

  // Spectators (and any non-answering view) get a clean read-only reveal grid.
  const showReveal = state.phase === 'reveal';

  return (
    <GameBody className="relative">
      <Progress
        state={state}
        total={total}
        isGroup={isGroup}
        matchedCount={matchedCount}
        syncPercent={syncPercent}
        strings={strings}
      />

      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink3">{prompt.q}</p>
        <p className="mt-1 text-lg font-bold tracking-tight text-ink">{strings.thisOrThat}</p>
      </div>

      {showReveal ? (
        <RevealGrid
          players={players}
          picks={picks}
          prompt={prompt}
          isGroup={isGroup}
          reduced={reduced}
          strings={strings}
        />
      ) : (
        <div className="flex flex-col items-center gap-4">
          {/* Per-round countdown timer. */}
          <CountdownRing
            progress={timerProgress}
            size={52}
            tone={secondsLeft <= 3 ? 'bad' : 'accent'}
            label={String(secondsLeft)}
          />

          {isSpectator ? (
            <TurnBadge tone="wait">
              {isGroup ? strings.answered(answeredCount, players.length) : strings.spectating}
            </TurnBadge>
          ) : (
            <TurnBadge tone={myPick !== null ? 'wait' : 'you'}>
              {myPick !== null
                ? isGroup
                  ? strings.answered(answeredCount, players.length)
                  : strings.waitingFor(peerName)
                : strings.pickTogether}
            </TurnBadge>
          )}

          {isSpectator ? (
            // Read-only tiles: watchers see the prompt and live answer tally,
            // but cannot pick.
            <div className="grid w-full grid-cols-2 gap-3 opacity-90">
              {options.map((o) => (
                <div
                  key={o.choice}
                  className="flex min-h-24 select-none items-center justify-center rounded-[var(--radius)] border-2 border-edge bg-panel p-4 text-center"
                >
                  <span className="text-base font-bold leading-tight text-ink">{o.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid w-full grid-cols-2 gap-3">
              {options.map((o) => (
                <ChoiceCard
                  key={o.choice}
                  selected={myPick === o.choice}
                  disabled={myPick !== null}
                  onClick={() => answer(o.choice)}
                  className="min-h-24"
                >
                  <span className="text-base font-bold leading-tight">{o.label}</span>
                </ChoiceCard>
              ))}
            </div>
          )}
        </div>
      )}
    </GameBody>
  );
}

/** Plays win/lose cue + haptic exactly once when the summary mounts. */
function MatchSummaryEffects({ ratio, reduced }: { ratio: number; reduced: boolean }) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    if (ratio >= 0.8) {
      playCue('win');
      if (!reduced) hapticSuccess();
    } else if (ratio >= 0.5) {
      playCue('draw');
    } else {
      playCue('lose');
      hapticError();
    }
  }, [ratio, reduced]);
  return null;
}

function Progress({
  state,
  total,
  isGroup,
  matchedCount,
  syncPercent,
  strings,
}: {
  state: MeldState;
  total: number;
  isGroup: boolean;
  matchedCount: number;
  syncPercent: number;
  strings: ReturnType<typeof getMindMeldStrings>;
}) {
  const current = Math.min(state.round + 1, total);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold tabular-nums text-ink2">
          {current} / {total}
        </span>
        <span className="rounded-full bg-goodbg px-2.5 py-0.5 font-mono text-xs font-bold text-good">
          {isGroup ? strings.syncPercentBadge(syncPercent) : strings.inSyncCount(matchedCount)}
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={
              'h-2 w-2 rounded-full ' +
              (i < state.round ? 'bg-accent' : i === state.round ? 'bg-accent/60' : 'bg-edge2')
            }
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Animated reveal of everyone's picks. In 2-player it highlights a match; in a
 * group it highlights whichever side landed on the plurality answer.
 */
function RevealGrid({
  players,
  picks,
  prompt,
  isGroup,
  reduced,
  strings,
}: {
  players: Peer[];
  picks: (MeldChoice | null)[];
  prompt: MeldPrompt;
  isGroup: boolean;
  reduced: boolean;
  strings: ReturnType<typeof getMindMeldStrings>;
}) {
  const agreement = pluralityAgreement(picks);
  // The plurality option (0 or 1); ties fall back to option a.
  const counts = picks.reduce(
    (acc, c) => {
      if (c === 0) acc[0]++;
      else if (c === 1) acc[1]++;
      return acc;
    },
    [0, 0],
  );
  const pluralityChoice: MeldChoice = counts[1] > counts[0] ? 1 : 0;
  const twoPlayerMatch =
    !isGroup && picks.length >= 2 && picks[0] !== null && picks[0] === picks[1];
  const synced = isGroup ? agreement >= 0.75 : twoPlayerMatch;

  return (
    <div className="flex flex-col gap-4">
      <div className={cn('grid gap-3', players.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3')}>
        {players.map((p, i) => {
          const pick = picks[i] ?? null;
          const onPlurality = isGroup ? pick !== null && pick === pluralityChoice : twoPlayerMatch;
          return (
            <RevealCard
              key={p.id}
              player={p}
              pick={pick}
              prompt={prompt}
              highlight={onPlurality}
              reduced={reduced}
              delayMs={reduced ? 0 : i * 90}
            />
          );
        })}
      </div>
      <p className={cn('text-center text-lg font-bold', synced ? 'text-good' : 'text-ink2')}>
        {isGroup ? strings.groupInSync(Math.round(agreement * 100)) : synced ? strings.inSync : strings.offThisTime}
      </p>
    </div>
  );
}

function RevealCard({
  player,
  pick,
  prompt,
  highlight,
  reduced,
  delayMs,
}: {
  player: Peer;
  pick: MeldChoice | null;
  prompt: MeldPrompt;
  highlight: boolean;
  reduced: boolean;
  delayMs: number;
}) {
  const text = pick === null ? '—' : pick === 0 ? prompt.a : prompt.b;
  return (
    <div
      style={reduced ? undefined : { animation: `meldReveal 360ms both`, animationDelay: `${delayMs}ms` }}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-[var(--radius)] border p-4 text-center transition-colors',
        highlight ? 'border-good/50 bg-goodbg text-good' : 'border-edge bg-panel2 text-ink2',
      )}
    >
      <Avatar seed={player.id} name={player.name} size={28} />
      <span className="w-full truncate text-xs font-semibold uppercase tracking-wide opacity-80">
        {player.name}
      </span>
      <span className="text-base font-bold leading-tight">{text}</span>
      {/* Keyframes are inline so this game stays self-contained. */}
      <style>{`@keyframes meldReveal{from{opacity:0;transform:translateY(8px) scale(0.96)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

/** Running list of the prompts the group synced on. */
function HistoryList({
  history,
  strings,
}: {
  history: { round: number; label: string }[];
  strings: ReturnType<typeof getMindMeldStrings>;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-edge bg-panel2 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">{strings.historyTitle}</p>
      {history.length === 0 ? (
        <p className="text-sm text-ink3">{strings.historyEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {history.map((h) => (
            <li key={h.round} className="flex items-center gap-2 text-sm text-ink2">
              <span className="text-good">✓</span>
              <span className="truncate">{h.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MindMeld;
