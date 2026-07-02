import { useCallback, useState } from 'react';
import { Circle, X } from 'lucide-react';
import { useGameRoom } from '../../net/useGameRoom';
import { useGameChannel } from '../../net/useGameChannel';
import { GameBody, ResultBanner, TouchButton, TurnBadge, WaitingForPeer } from '../../ui/gamesUi';
import { cn } from '../../../../lib/cn';
import { currentMark, emptyBoard, isFull, WIN_LINES, winner, type Board, type Mark } from './logic';

// `gen` is a match-generation counter: it bumps on every rematch so a move
// that was in flight when the board reset is recognised as stale and dropped.
type TttMsg = { kind: 'move'; index: number; gen: number } | { kind: 'rematch'; gen: number };

export function TicTacToe() {
  const { self, peer, connected } = useGameRoom();
  const myMark: Mark = self?.role === 'host' ? 'X' : 'O';

  const [board, setBoard] = useState<Board>(emptyBoard);
  const [tally, setTally] = useState({ me: 0, peer: 0, draws: 0 });
  const [gen, setGen] = useState(0);

  const win = winner(board);
  const full = isFull(board);
  const over = win !== null || full;
  const turn = currentMark(board);
  const myTurn = !over && turn === myMark;

  const scoreBoard = useCallback(
    (finished: Board, mark: Mark) => {
      const w = winner(finished);
      if (w) {
        setTally((t) =>
          w === mark ? { ...t, me: t.me + 1 } : { ...t, peer: t.peer + 1 },
        );
      } else if (isFull(finished)) {
        setTally((t) => ({ ...t, draws: t.draws + 1 }));
      }
    },
    [],
  );

  const send = useGameChannel<TttMsg>((msg) => {
    if (msg.kind === 'rematch') {
      setGen(msg.gen);
      setBoard(emptyBoard());
      return;
    }
    // Drop moves from a previous match generation (e.g. one in flight at rematch).
    if (msg.gen !== gen) return;
    setBoard((prev) => {
      const peerMark: Mark = myMark === 'X' ? 'O' : 'X';
      // Validate the relayed move is well-formed and legal for the peer to make:
      // in range, on an empty cell, game not over, and actually the peer's turn.
      if (!Number.isInteger(msg.index) || msg.index < 0 || msg.index > 8) return prev;
      if (prev[msg.index] || winner(prev)) return prev;
      if (currentMark(prev) !== peerMark) return prev;
      const next = [...prev];
      next[msg.index] = peerMark;
      scoreBoard(next, myMark);
      return next;
    });
  });

  const play = (index: number) => {
    if (over || board[index] || turn !== myMark) return;
    const next = [...board];
    next[index] = myMark;
    setBoard(next);
    scoreBoard(next, myMark);
    send({ kind: 'move', index, gen });
  };

  const rematch = () => {
    const nextGen = gen + 1;
    setGen(nextGen);
    setBoard(emptyBoard());
    send({ kind: 'rematch', gen: nextGen });
  };

  if (!connected) return <WaitingForPeer name={peer?.name} />;

  const iWon = win === myMark;
  const meName = self?.name ?? 'You';
  const peerName = peer?.name ?? 'Partner';

  return (
    <GameBody>
      <Scoreboard
        me={meName}
        peer={peerName}
        myMark={myMark}
        myScore={tally.me}
        peerScore={tally.peer}
        draws={tally.draws}
      />

      {over ? (
        <ResultBanner
          tone={win ? (iWon ? 'win' : 'lose') : 'draw'}
          title={win ? (iWon ? '🎉 You win!' : `${peerName} wins`) : "It's a draw"}
          detail={win ? `${win} completes a line` : 'Board full — nobody got three.'}
        />
      ) : (
        <div className="flex justify-center">
          <TurnBadge tone={myTurn ? 'you' : 'peer'}>
            {myTurn ? `Your move · ${myMark}` : `${peerName}'s move · ${turn}`}
          </TurnBadge>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5" role="grid" aria-label="tic-tac-toe board">
        {board.map((cell, i) => (
          <Cell
            key={i}
            mark={cell}
            highlighted={win !== null && lineHas(board, i)}
            disabled={!myTurn || cell !== null}
            onClick={() => play(i)}
          />
        ))}
      </div>

      {over && (
        <TouchButton variant="primary" size="lg" onClick={rematch}>
          Play again
        </TouchButton>
      )}
    </GameBody>
  );
}

/** True when cell `i` sits on the completed winning line (for highlighting). */
function lineHas(board: Board, i: number): boolean {
  const w = winner(board);
  if (!w) return false;
  return WIN_LINES.some(
    (line) => line.includes(i) && line.every((idx) => board[idx] === w),
  );
}

function Cell({
  mark,
  highlighted,
  disabled,
  onClick,
}: {
  mark: Mark | null;
  highlighted: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={mark ? `cell ${mark}` : 'empty cell'}
      className={cn(
        'flex aspect-square items-center justify-center rounded-[var(--radius)] border-2 transition-all',
        'touch-manipulation active:scale-[0.97] disabled:pointer-events-none',
        highlighted
          ? 'border-good/60 bg-good/10'
          : mark
            ? 'border-edge2 bg-panel2'
            : 'border-edge bg-panel hover:border-edge2 hover:bg-panel2',
      )}
    >
      {mark === 'X' && <X className="h-2/3 w-2/3 text-accent" strokeWidth={2.5} />}
      {mark === 'O' && <Circle className="h-3/5 w-3/5 text-ink" strokeWidth={2.5} />}
    </button>
  );
}

function Scoreboard({
  me,
  peer,
  myMark,
  myScore,
  peerScore,
  draws,
}: {
  me: string;
  peer: string;
  myMark: Mark;
  myScore: number;
  peerScore: number;
  draws: number;
}) {
  const peerMark: Mark = myMark === 'X' ? 'O' : 'X';
  return (
    <div className="flex items-stretch justify-center gap-3 text-center">
      <Tally name={me} mark={myMark} score={myScore} accent />
      <div className="flex flex-col items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-wide text-ink3">draws</div>
        <div className="font-mono text-2xl font-bold tabular-nums text-ink2">{draws}</div>
      </div>
      <Tally name={peer} mark={peerMark} score={peerScore} />
    </div>
  );
}

function Tally({
  name,
  mark,
  score,
  accent,
}: {
  name: string;
  mark: Mark;
  score: number;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="truncate text-sm font-semibold text-ink">
        {name} <span className="text-ink3">({mark})</span>
      </div>
      <div
        className={cn(
          'font-mono text-3xl font-bold tabular-nums',
          accent ? 'text-accent' : 'text-ink2',
        )}
      >
        {score}
      </div>
    </div>
  );
}

export default TicTacToe;
