import { useCallback, useEffect, useState } from 'react';
import { useGameRoom } from '../../net/useGameRoom';
import { useGameChannel } from '../../net/useGameChannel';
import { ChoiceCard, GameBody, ResultBanner, TouchButton, TurnBadge, WaitingForPeer } from '../../ui/gamesUi';
import { compatibilityLabel, isMatch, type MeldChoice } from './logic';
import { MELD_PROMPTS } from './prompts';

type MeldMsg = { kind: 'answer'; round: number; choice: MeldChoice } | { kind: 'rematch' };

type Phase = 'answer' | 'reveal' | 'over';

const REVEAL_MS = 2200;
const TOTAL = MELD_PROMPTS.length;

export function MindMeld() {
  const { self, peer, connected } = useGameRoom();
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [myPick, setMyPick] = useState<MeldChoice | null>(null);
  const [peerPicks, setPeerPicks] = useState<Record<number, MeldChoice>>({});
  const [syncScore, setSyncScore] = useState(0);

  const resetMatch = useCallback(() => {
    setRound(0);
    setPhase('answer');
    setMyPick(null);
    setPeerPicks({});
    setSyncScore(0);
  }, []);

  const send = useGameChannel<MeldMsg>((msg) => {
    if (msg.kind === 'answer') {
      setPeerPicks((prev) => ({ ...prev, [msg.round]: msg.choice }));
    } else if (msg.kind === 'rematch') {
      resetMatch();
    }
  });

  const peerPick = peerPicks[round] ?? null;
  const matched = myPick !== null && peerPick !== null ? isMatch(myPick, peerPick) : null;

  // Once both answers for this prompt are in, tally and flip to reveal.
  useEffect(() => {
    if (phase !== 'answer' || myPick === null || peerPick === null) return;
    if (isMatch(myPick, peerPick)) setSyncScore((s) => s + 1);
    setPhase('reveal');
  }, [phase, myPick, peerPick]);

  // Auto-advance after showing the reveal for a beat.
  useEffect(() => {
    if (phase !== 'reveal') return;
    const t = setTimeout(() => {
      if (round + 1 >= TOTAL) {
        setPhase('over');
      } else {
        setRound((r) => r + 1);
        setMyPick(null);
        setPhase('answer');
      }
    }, REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase, round]);

  const answer = (c: MeldChoice) => {
    if (myPick !== null || phase !== 'answer') return;
    setMyPick(c);
    send({ kind: 'answer', round, choice: c });
  };

  const rematch = () => {
    resetMatch();
    send({ kind: 'rematch' });
  };

  if (!connected) return <WaitingForPeer name={peer?.name} />;

  const meName = self?.name ?? 'You';
  const peerName = peer?.name ?? 'Partner';

  if (phase === 'over') {
    const ratio = TOTAL > 0 ? syncScore / TOTAL : 0;
    return (
      <GameBody>
        <Progress round={TOTAL} total={TOTAL} score={syncScore} />
        <ResultBanner
          tone={ratio >= 0.8 ? 'win' : ratio >= 0.5 ? 'draw' : 'lose'}
          title={`In sync ${syncScore} / ${TOTAL}`}
          detail={compatibilityLabel(syncScore, TOTAL)}
        />
        <TouchButton variant="primary" size="lg" onClick={rematch}>
          Play again
        </TouchButton>
      </GameBody>
    );
  }

  const prompt = MELD_PROMPTS[round];
  const options: { choice: MeldChoice; label: string }[] = [
    { choice: 0, label: prompt.a },
    { choice: 1, label: prompt.b },
  ];

  return (
    <GameBody>
      <Progress round={round} total={TOTAL} score={syncScore} />

      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink3">{prompt.q}</p>
        <p className="mt-1 text-lg font-bold tracking-tight text-ink">This or that?</p>
      </div>

      {phase === 'reveal' && matched !== null ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <RevealCard label={meName} pick={myPick} prompt={prompt} highlight={matched} />
            <RevealCard label={peerName} pick={peerPick} prompt={prompt} highlight={matched} />
          </div>
          <p className="text-center text-lg font-bold">
            {matched ? 'In sync! 💞' : 'Off this time'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <TurnBadge tone={myPick !== null ? 'wait' : 'you'}>
            {myPick !== null ? `Waiting for ${peerName}…` : 'Pick together'}
          </TurnBadge>
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
        </div>
      )}
    </GameBody>
  );
}

function Progress({ round, total, score }: { round: number; total: number; score: number }) {
  const current = Math.min(round + 1, total);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold tabular-nums text-ink2">
          {current} / {total}
        </span>
        <span className="rounded-full bg-goodbg px-2.5 py-0.5 font-mono text-xs font-bold text-good">
          {score} in sync
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={
              'h-2 w-2 rounded-full ' +
              (i < round ? 'bg-accent' : i === round ? 'bg-accent/60' : 'bg-edge2')
            }
          />
        ))}
      </div>
    </div>
  );
}

function RevealCard({
  label,
  pick,
  prompt,
  highlight,
}: {
  label: string;
  pick: MeldChoice | null;
  prompt: { a: string; b: string };
  highlight: boolean;
}) {
  const text = pick === null ? '—' : pick === 0 ? prompt.a : prompt.b;
  return (
    <div
      className={
        'flex flex-col items-center gap-1.5 rounded-[var(--radius)] border p-4 text-center ' +
        (highlight ? 'border-good/50 bg-goodbg text-good' : 'border-edge bg-panel2 text-ink2')
      }
    >
      <span className="truncate text-xs font-semibold uppercase tracking-wide opacity-80">{label}</span>
      <span className="text-base font-bold leading-tight">{text}</span>
    </div>
  );
}

export default MindMeld;
