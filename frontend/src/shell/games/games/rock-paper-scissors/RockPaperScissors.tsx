import { useCallback, useEffect, useMemo, useState } from 'react';
import { getArcadeStrings, useGamesLocale } from '../../locale';
import { useGameRoom } from '../../net/useGameRoom';
import { useGameChannel } from '../../net/useGameChannel';
import { ChoiceCard, GameBody, ResultBanner, TouchButton, TurnBadge, WaitingForPeer } from '../../ui/gamesUi';
import { CHOICES, matchOver, outcome, WIN_TARGET, type Choice } from './logic';

type RpsMsg = { kind: 'pick'; round: number; choice: Choice } | { kind: 'rematch' };

type Phase = 'pick' | 'reveal' | 'over';

const REVEAL_MS = 2200;

export function RockPaperScissors() {
  const { locale } = useGamesLocale();
  const arcade = useMemo(() => getArcadeStrings(locale), [locale]);
  const { self, peer, connected } = useGameRoom();
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('pick');
  const [myPick, setMyPick] = useState<Choice | null>(null);
  const [peerPicks, setPeerPicks] = useState<Record<number, Choice>>({});
  const [scores, setScores] = useState({ me: 0, peer: 0 });

  const resetMatch = useCallback(() => {
    setRound(0);
    setPhase('pick');
    setMyPick(null);
    setPeerPicks({});
    setScores({ me: 0, peer: 0 });
  }, []);

  const send = useGameChannel<RpsMsg>((msg) => {
    if (msg.kind === 'pick') {
      setPeerPicks((prev) => ({ ...prev, [msg.round]: msg.choice }));
    } else if (msg.kind === 'rematch') {
      resetMatch();
    }
  });

  const peerPick = peerPicks[round] ?? null;

  // Once both picks for the round are in, score it and flip to reveal.
  useEffect(() => {
    if (phase !== 'pick' || !myPick || !peerPick) return;
    const o = outcome(myPick, peerPick);
    setScores((s) => ({ me: s.me + (o === 'win' ? 1 : 0), peer: s.peer + (o === 'lose' ? 1 : 0) }));
    setPhase('reveal');
  }, [phase, myPick, peerPick]);

  // Auto-advance after showing the reveal for a beat.
  useEffect(() => {
    if (phase !== 'reveal') return;
    const t = setTimeout(() => {
      if (matchOver(scores.me, scores.peer)) {
        setPhase('over');
      } else {
        setRound((r) => r + 1);
        setMyPick(null);
        setPhase('pick');
      }
    }, REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase, scores]);

  const pick = (c: Choice) => {
    if (myPick || phase !== 'pick') return;
    setMyPick(c);
    send({ kind: 'pick', round, choice: c });
  };

  const rematch = () => {
    resetMatch();
    send({ kind: 'rematch' });
  };

  if (!connected) {
    return <WaitingForPeer message={arcade.waitingReconnect(peer?.name ?? arcade.picker.partner)} />;
  }

  const emojiFor = (c: Choice) => CHOICES.find((x) => x.id === c)?.emoji ?? '❔';
  const roundOutcome = myPick && peerPick ? outcome(myPick, peerPick) : null;

  return (
    <GameBody>
      <Scoreboard
        me={self?.name ?? 'You'}
        peer={peer?.name ?? 'Partner'}
        myScore={scores.me}
        peerScore={scores.peer}
      />
      <p className="text-center text-xs text-ink3">First to {WIN_TARGET} wins · best of 5</p>

      {phase === 'over' ? (
        <>
          <ResultBanner
            tone={scores.me > scores.peer ? 'win' : 'lose'}
            title={scores.me > scores.peer ? '🎉 You win!' : `${peer?.name ?? 'Partner'} wins`}
            detail={`${scores.me} – ${scores.peer}`}
          />
          <TouchButton variant="primary" size="lg" onClick={rematch}>
            Rematch
          </TouchButton>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Hand label={self?.name ?? 'You'} emoji={myPick ? emojiFor(myPick) : '⏳'} locked={!!myPick} revealed />
            <Hand
              label={peer?.name ?? 'Partner'}
              emoji={phase === 'reveal' && peerPick ? emojiFor(peerPick) : '❔'}
              locked={!!peerPick}
              revealed={phase === 'reveal'}
            />
          </div>

          {phase === 'reveal' && roundOutcome ? (
            <p className="text-center text-lg font-bold">
              {roundOutcome === 'win' ? 'You take it! 🙌' : roundOutcome === 'lose' ? 'They got you 😅' : "It's a tie 🤝"}
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <TurnBadge tone={myPick ? 'wait' : 'you'}>
                {myPick ? 'Locked in — waiting…' : 'Make your move'}
              </TurnBadge>
              <div className="grid w-full grid-cols-3 gap-3">
                {CHOICES.map((c) => (
                  <ChoiceCard key={c.id} selected={myPick === c.id} disabled={!!myPick} onClick={() => pick(c.id)}>
                    <span className="text-4xl leading-none">{c.emoji}</span>
                    <span className="text-xs font-semibold">{c.label}</span>
                  </ChoiceCard>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </GameBody>
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

function Hand({ label, emoji, locked, revealed }: { label: string; emoji: string; locked: boolean; revealed: boolean }) {
  return (
    <div
      className={
        'flex flex-col items-center gap-2 rounded-[var(--radius)] border p-4 ' +
        (revealed ? 'border-accent/40 bg-accentbg' : locked ? 'border-edge2 bg-panel2' : 'border-edge bg-panel')
      }
    >
      <span className="text-5xl leading-none">{emoji}</span>
      <span className="truncate text-xs font-semibold text-ink2">{label}</span>
    </div>
  );
}

export default RockPaperScissors;
