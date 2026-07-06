import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { playCue } from '@/lib/utils/audio';
import { hapticError, hapticSuccess } from '@/lib/utils/haptic';
import { useGameRoom } from '../../net/useGameRoom';
import { useGameChannel } from '../../net/useGameChannel';
import { useMatchReporter } from '../../net/useMatchReporter';
import { usePublishState } from '../../net/usePublishState';
import { Avatar } from '../../ui/Avatar';
import { Confetti, CountdownRing } from '../../ui/effects';
import { usePrefersReducedMotion } from '../../ui/hooks';
import { GameBody, ResultBanner, TouchButton, TurnBadge, WaitingForPeer } from '../../ui/gamesUi';
import {
  ROUND_MS,
  REVEAL_MS,
  freshState,
  startGame,
  isMatch,
  computeRoundDeltas,
  applyDeltas,
  compatLabel,
  type WyrChoice,
  type WyrState,
} from './logic';
import { CATEGORY_LABELS, type WyrCategory } from './prompts';
import { WYR_STRINGS } from './strings';

type WyrMsg =
  | { kind: 'answer'; round: number; choice: WyrChoice }
  | { kind: 'rematch' }
  | { kind: 'start'; seed: number; categories: WyrCategory[] };

export function WouldYouRather() {
  const s = WYR_STRINGS;
  const { self, peer, players, connected, role, isSpectator, publishState, sharedState } = useGameRoom();
  const { report } = useMatchReporter('would-you-rather');
  const isHost = role === 'host';
  const reduced = usePrefersReducedMotion();

  const [state, setState] = useState<WyrState>(freshState);

  // Adopt inbound shared state (guests + spectators + host echo).
  useEffect(() => {
    if (sharedState && typeof sharedState === 'object' && 'phase' in (sharedState as object)) {
      setState(sharedState as WyrState);
    }
  }, [sharedState]);

  const commit = useCallback((next: WyrState) => {
    setState(next);
  }, []);

  usePublishState(isHost, [state], () => publishState(state));

  const recordAnswer = useCallback((round: number, peerId: string, choice: WyrChoice) => {
    setState((prev) => {
      if (prev.phase !== 'picking' || round !== prev.round) return prev;
      const row = prev.answers[round] ?? {};
      if (peerId in row) return prev;
      return { ...prev, answers: { ...prev.answers, [round]: { ...row, [peerId]: choice } } };
    });
  }, []);

  const send = useGameChannel<WyrMsg>((msg, fromId) => {
    if (msg.kind === 'answer') {
      recordAnswer(msg.round, fromId, msg.choice);
    } else if (msg.kind === 'rematch') {
      if (!isHost) setState(freshState());
    } else if (msg.kind === 'start') {
      if (!isHost) {
        setState((prev) => ({
          ...prev,
          ...startGame(msg.categories, msg.seed),
        }));
      }
    }
  });

  // --- Host: open a deadline when we enter the picking phase ---
  useEffect(() => {
    if (!isHost || state.phase !== 'picking' || state.deadline !== null) return;
    commit({ ...state, deadline: Date.now() + ROUND_MS });
  }, [isHost, state, commit]);

  // --- Host: advance round when everyone answered or time runs out ---
  useEffect(() => {
    if (!isHost || state.phase !== 'picking') return;
    const tryAdvance = () => {
      const row = state.answers[state.round] ?? {};
      const playerIds = players.map((p) => p.id);
      const everyone = playerIds.length > 0 && playerIds.every((id) => id in row);
      const expired = state.deadline !== null && Date.now() >= state.deadline;
      if (everyone || expired) {
        const deltas = computeRoundDeltas(row, playerIds);
        const newScores = applyDeltas(state.scores, deltas);
        commit({ ...state, phase: 'reveal', deadline: null, scores: newScores });
      }
    };
    tryAdvance();
    const id = setInterval(tryAdvance, 200);
    return () => clearInterval(id);
  }, [isHost, state, players, commit]);

  // --- Host: hold reveal then advance or end ---
  useEffect(() => {
    if (!isHost || state.phase !== 'reveal') return;
    const t = setTimeout(() => {
      if (state.round + 1 >= state.prompts.length) {
        commit({ ...state, phase: 'over' });
      } else {
        commit({ ...state, round: state.round + 1, phase: 'picking', deadline: null });
      }
    }, REVEAL_MS);
    return () => clearTimeout(t);
  }, [isHost, state, commit]);

  // --- Countdown ring (all clients derive from shared deadline) ---
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state.phase !== 'picking' || state.deadline === null) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [state.phase, state.deadline]);
  const remainingMs = state.deadline !== null ? Math.max(0, state.deadline - now) : ROUND_MS;
  const timerProgress = state.deadline !== null ? remainingMs / ROUND_MS : 1;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  // --- Sound + haptic on reveal ---
  const revealedRef = useRef(-1);
  useEffect(() => {
    if (state.phase !== 'reveal' || revealedRef.current === state.round) return;
    revealedRef.current = state.round;
    const playerIds = players.map((p) => p.id);
    const row = state.answers[state.round] ?? {};
    if (isMatch(row, playerIds)) {
      playCue('select');
      hapticSuccess();
    } else {
      playCue('tick');
      hapticError();
    }
  }, [state, players]);
  useEffect(() => {
    if (state.phase === 'picking') revealedRef.current = -1;
  }, [state.phase]);

  // --- Derived ---
  const myId = self?.id ?? '';
  const myPick = myId && state.phase !== 'category-pick'
    ? ((state.answers[state.round] ?? {})[myId] ?? null)
    : null;

  const matchCount = useMemo(() => {
    let n = 0;
    const playerIds = players.map((p) => p.id);
    for (let r = 0; r < state.round; r++) {
      if (isMatch(state.answers[r] ?? {}, playerIds)) n++;
    }
    if (state.phase === 'reveal' && isMatch(state.answers[state.round] ?? {}, players.map((p) => p.id))) n++;
    return n;
  }, [state, players]);

  // --- Match reporting ---
  const reportedRef = useRef(false);
  useEffect(() => {
    if (state.phase !== 'over') { reportedRef.current = false; return; }
    if (reportedRef.current) return;
    reportedRef.current = true;
    const sorted = [...players].sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0));
    const topScore = state.scores[sorted[0]?.id] ?? 0;
    void report(
      sorted.map((p, i) => ({
        peerId: p.id,
        placement: (state.scores[p.id] ?? 0) === topScore && i === 0 ? 1 : 2,
        score: state.scores[p.id] ?? 0,
      })),
    );
  }, [state.phase, state.scores, players, report]);

  // --- Rematch ---
  const rematch = () => {
    if (!isHost) return;
    playCue('click');
    const next = freshState();
    setState(next);
    send({ kind: 'rematch' });
  };

  if (!connected) {
    return <WaitingForPeer message={`Waiting for ${peer?.name ?? s.partner}…`} />;
  }

  // ---- Category picker (host only at game start) ----
  if (state.phase === 'category-pick') {
    return <CategoryPicker isHost={isHost} onStart={(cats) => {
      const seed = Date.now() & 0xffffffff;
      const partial = startGame(cats, seed);
      setState((prev) => ({ ...prev, ...partial }));
      send({ kind: 'start', seed, categories: cats });
    }} />;
  }

  const prompt = state.prompts[state.round];
  const playerIds = players.map((p) => p.id);

  // ---- End screen ----
  if (state.phase === 'over') {
    const total = state.prompts.length;
    const ratio = total > 0 ? matchCount / total : 0;
    const label = compatLabel(matchCount, total);
    return (
      <GameBody>
        <Confetti fire={ratio >= 0.75} />
        <EndSummaryEffects ratio={ratio} reduced={reduced} />
        <HeartMeter matched={matchCount} total={total} />
        <ResultBanner
          tone={ratio >= 0.75 ? 'win' : ratio >= 0.5 ? 'draw' : 'lose'}
          title={s.finalTitle(matchCount, total)}
          detail={s.compat[label]}
        />
        <ScoreBoard players={players} scores={state.scores} />
        {isHost ? (
          <TouchButton variant="primary" size="lg" onClick={rematch}>{s.playAgain}</TouchButton>
        ) : (
          <p className="text-center text-sm text-ink3">{s.spectatorWaiting}</p>
        )}
      </GameBody>
    );
  }

  if (!prompt) return null;

  const row = state.answers[state.round] ?? {};
  const showReveal = state.phase === 'reveal';

  return (
    <GameBody>
      {/* Round progress */}
      <RoundProgress round={state.round} total={state.prompts.length} matchCount={matchCount} />

      {/* Prompt */}
      <div className="rounded-2xl bg-gradient-to-br from-accent/10 via-panel to-panel2 border border-accent/20 p-5 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">{s.wouldYouRather}</p>
        <p className="text-lg font-bold leading-snug text-ink">{prompt.a}</p>
        <div className="my-3 flex items-center gap-2">
          <div className="flex-1 h-px bg-edge" />
          <span className="text-xs font-semibold text-ink3 px-2">OR</span>
          <div className="flex-1 h-px bg-edge" />
        </div>
        <p className="text-lg font-bold leading-snug text-ink">{prompt.b}</p>
      </div>

      {showReveal ? (
        <RevealPanel players={players} row={row} prompt={prompt} reduced={reduced} />
      ) : (
        <PickingPanel
          isSpectator={isSpectator}
          myPick={myPick}
          timerProgress={timerProgress}
          secondsLeft={secondsLeft}
          peerName={peer?.name ?? s.partner}
          answeredCount={Object.keys(row).filter((id) => playerIds.includes(id)).length}
          total={players.length}
          onPick={(choice) => {
            if (isSpectator || myPick !== null || state.phase !== 'picking') return;
            playCue('click');
            if (isHost) {
              recordAnswer(state.round, myId, choice);
            } else {
              setState((prev) => {
                if (prev.phase !== 'picking') return prev;
                const r = prev.answers[prev.round] ?? {};
                return { ...prev, answers: { ...prev.answers, [prev.round]: { ...r, [myId]: choice } } };
              });
              send({ kind: 'answer', round: state.round, choice });
            }
          }}
        />
      )}
    </GameBody>
  );
}

// ---- Sub-components ----

function CategoryPicker({ isHost, onStart }: { isHost: boolean; onStart: (cats: WyrCategory[]) => void }) {
  const s = WYR_STRINGS;
  const [selected, setSelected] = useState<Set<WyrCategory>>(new Set());

  const toggle = (cat: WyrCategory) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (!isHost) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="text-4xl animate-bounce">🎲</span>
        <p className="text-sm font-medium text-ink2">Host is choosing the vibe…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h3 className="text-lg font-bold text-ink">{s.chooseCategoriesTitle}</h3>
        <p className="text-sm text-ink3 mt-1">{s.chooseCategoriesHint}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(CATEGORY_LABELS) as WyrCategory[]).map((cat) => {
          const { label, emoji } = CATEGORY_LABELS[cat];
          const on = selected.has(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all touch-manipulation active:scale-[0.97]',
                on
                  ? 'border-accent bg-accentbg text-accent shadow-[0_0_0_3px_var(--accent-bg)]'
                  : 'border-edge bg-panel text-ink hover:border-edge2 hover:bg-panel2',
              )}
            >
              <span className="text-3xl">{emoji}</span>
              <span className="font-bold text-sm">{label}</span>
            </button>
          );
        })}
      </div>
      <TouchButton
        variant="primary"
        size="lg"
        onClick={() => {
          playCue('select');
          onStart(selected.size === 0 ? [] : [...selected]);
        }}
      >
        {selected.size === 0 ? s.allCategories : s.startGame}
      </TouchButton>
    </div>
  );
}

function PickingPanel({
  isSpectator,
  myPick,
  timerProgress,
  secondsLeft,
  peerName,
  answeredCount,
  total,
  onPick,
}: {
  isSpectator: boolean;
  myPick: WyrChoice | null;
  timerProgress: number;
  secondsLeft: number;
  peerName: string;
  answeredCount: number;
  total: number;
  onPick: (choice: WyrChoice) => void;
}) {
  const s = WYR_STRINGS;
  const picked = myPick !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <CountdownRing
          progress={timerProgress}
          size={44}
          tone={secondsLeft <= 3 ? 'bad' : 'accent'}
          label={String(secondsLeft)}
        />
        <TurnBadge tone={isSpectator ? 'wait' : picked ? 'wait' : 'you'}>
          {isSpectator
            ? `${answeredCount}/${total} answered`
            : picked
              ? WYR_STRINGS.waitingFor(peerName)
              : s.pickOne}
        </TurnBadge>
      </div>

      {/* Two large tap targets stacked vertically on mobile */}
      <div className="flex flex-col gap-3">
        {(['a', 'b'] as WyrChoice[]).map((choice) => (
          <OptionButton
            key={choice}
            choice={choice}
            selected={myPick === choice}
            disabled={isSpectator || picked}
            onClick={() => onPick(choice)}
          />
        ))}
      </div>
    </div>
  );
}

function OptionButton({
  choice,
  selected,
  disabled,
  onClick,
}: {
  choice: WyrChoice;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 min-h-[72px] w-full rounded-2xl border-2 px-5 py-4 text-start transition-all touch-manipulation active:scale-[0.98] disabled:pointer-events-none',
        selected
          ? 'border-accent bg-accentbg text-accent shadow-[0_0_0_3px_var(--accent-bg)]'
          : 'border-edge bg-panel text-ink hover:border-accent/50 hover:bg-panel2',
        disabled && !selected && 'opacity-50',
      )}
    >
      <span className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold border-2',
        selected ? 'border-accent bg-accent text-white' : 'border-edge2 text-ink3',
      )}>
        {choice.toUpperCase()}
      </span>
      <span className="text-sm font-semibold leading-snug">
        {selected ? '✓ Your pick!' : choice === 'a' ? 'This one' : 'That one'}
      </span>
    </button>
  );
}

function RevealPanel({
  players,
  row,
  prompt,
  reduced,
}: {
  players: { id: string; name: string }[];
  row: Record<string, WyrChoice>;
  prompt: { a: string; b: string };
  reduced: boolean;
}) {
  const playerIds = players.map((p) => p.id);
  const matched = isMatch(row, playerIds);

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(
        'text-center rounded-2xl border-2 py-3 px-4 font-bold text-base transition-all',
        matched ? 'border-good/50 bg-goodbg text-good' : 'border-edge bg-panel2 text-ink2',
      )}>
        {matched ? WYR_STRINGS.matched : WYR_STRINGS.noMatch}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {players.map((p, i) => {
          const pick = row[p.id] ?? null;
          const text = pick === null ? '—' : pick === 'a' ? prompt.a : prompt.b;
          const onWinSide = matched || pick !== null;
          return (
            <div
              key={p.id}
              style={reduced ? undefined : { animation: `wyrReveal 380ms both`, animationDelay: `${i * 100}ms` }}
              className={cn(
                'flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center',
                matched ? 'border-good/50 bg-goodbg text-good' : onWinSide ? 'border-edge bg-panel2 text-ink2' : 'border-edge bg-panel text-ink3',
              )}
            >
              <Avatar seed={p.id} name={p.name} size={32} />
              <span className="text-xs font-bold uppercase tracking-wide opacity-70">{p.name}</span>
              <span className="text-sm font-bold leading-snug">
                {pick !== null ? `Option ${pick.toUpperCase()}` : '—'}
              </span>
              <span className="text-xs opacity-80 leading-snug">{text}</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes wyrReveal {
          from { opacity: 0; transform: scale(0.9) translateY(12px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

function RoundProgress({ round, total, matchCount }: { round: number; total: number; matchCount: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold tabular-nums text-ink2">
          {round + 1} / {total}
        </span>
        <span className="rounded-full bg-goodbg px-2.5 py-0.5 font-mono text-xs font-bold text-good">
          {matchCount} matched
        </span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              i < round ? 'bg-accent' : i === round ? 'bg-accent/60' : 'bg-edge2',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function HeartMeter({ matched, total }: { matched: number; total: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn('text-xl transition-all', i < matched ? 'opacity-100' : 'opacity-20')}>
            💕
          </span>
        ))}
      </div>
      <p className="text-xs text-ink3 font-medium">{matched} / {total} matches</p>
    </div>
  );
}

function ScoreBoard({ players, scores }: { players: { id: string; name: string }[]; scores: Record<string, number> }) {
  const ranked = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  return (
    <div className="rounded-2xl border border-edge bg-panel2 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink3">Score</p>
      <div className="flex flex-col gap-2">
        {ranked.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3">
            <span className="text-sm text-ink3 w-4 text-center">{i + 1}</span>
            <Avatar seed={p.id} name={p.name} size={28} />
            <span className="flex-1 text-sm font-semibold text-ink truncate">{p.name}</span>
            <span className="font-bold tabular-nums text-accent">{scores[p.id] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EndSummaryEffects({ ratio, reduced }: { ratio: number; reduced: boolean }) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    if (ratio >= 0.75) { playCue('win'); if (!reduced) hapticSuccess(); }
    else if (ratio >= 0.5) playCue('draw');
    else { playCue('lose'); hapticError(); }
  }, [ratio, reduced]);
  return null;
}

export default WouldYouRather;
