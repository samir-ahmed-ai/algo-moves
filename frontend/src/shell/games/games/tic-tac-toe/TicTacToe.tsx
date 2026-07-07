import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Eye, X } from 'lucide-react';
import { useGamesLocale } from '../../locale';
import { useGameRoom } from '../../net/useGameRoom';
import { useGameChannel } from '../../net/useGameChannel';
import { useMatchReporter } from '../../net/useMatchReporter';
import { usePublishState } from '../../net/usePublishState';
import { mergeNestedRoomState, useSharedStateRef } from '../../net/nestedRoomState';
import { GameArena, GameBody, ResultBanner, TouchButton, TurnBadge, WaitingForPeer } from '../../ui/gamesUi';
import { Confetti, CountdownRing } from '../../ui/effects';
import { Avatar } from '../../ui/Avatar';
import { usePrefersReducedMotion } from '../../ui/hooks';
import { playCue } from '@/lib/utils/audio';
import { hapticError, hapticSuccess } from '@/lib/utils/haptic';
import { cn } from '@/lib/utils/cn';
import {
  autoMoveIndex,
  currentMark,
  emptyBoard,
  isFull,
  winner,
  winningLine,
  type Board,
  type Mark,
} from './logic';
import { getTicTacToeStrings } from './strings';

// `gen` is a match-generation counter: it bumps on every rematch so a move
// that was in flight when the board reset is recognised as stale and dropped.
type TttMsg = { kind: 'move'; index: number; gen: number } | { kind: 'rematch'; gen: number };

/** Host-authoritative snapshot mirrored into shared room state for spectators + late joiners. */
type TttShared = { ttt?: { board: Board; gen: number } };

/** Seconds a player has to move before their turn auto-skips. */
const TURN_SECONDS = 15;

export function TicTacToe() {
  const { locale } = useGamesLocale();
  const strings = useMemo(() => getTicTacToeStrings(locale), [locale]);
  const { self, peer, players, connected, isSpectator, sharedState, publishState, role } =
    useGameRoom();
  const sharedStateRef = useSharedStateRef(sharedState);
  const { report } = useMatchReporter('tic-tac-toe');
  const reduced = usePrefersReducedMotion();

  const myMark: Mark = self?.role === 'host' ? 'X' : 'O';

  const [board, setBoard] = useState<Board>(emptyBoard);
  const [tally, setTally] = useState({ me: 0, peer: 0, draws: 0 });
  const [gen, setGen] = useState(0);
  // Index most recently placed (for the pop-in animation) and whether it was auto-played.
  const [lastPlaced, setLastPlaced] = useState<number | null>(null);

  const win = winner(board);
  const line = winningLine(board);
  const full = isFull(board);
  const over = win !== null || full;
  const turn = currentMark(board);
  const myTurn = !over && !isSpectator && turn === myMark;

  const scoreBoard = useCallback((finished: Board, mark: Mark) => {
    const w = winner(finished);
    if (w) {
      setTally((t) => (w === mark ? { ...t, me: t.me + 1 } : { ...t, peer: t.peer + 1 }));
    } else if (isFull(finished)) {
      setTally((t) => ({ ...t, draws: t.draws + 1 }));
    }
  }, []);

  // Host mirrors the board into shared state so spectators (and anyone who joins
  // mid-match) render the live game without needing the relayed move history.
  const publishBoard = useCallback(
    (nextBoard: Board, nextGen: number) => {
      if (role !== 'host') return;
      publishState(mergeNestedRoomState(sharedStateRef.current, 'ttt', { board: nextBoard, gen: nextGen }));
    },
    [role, publishState],
  );

  const send = useGameChannel<TttMsg>((msg) => {
    if (msg.kind === 'rematch') {
      setGen(msg.gen);
      setBoard(emptyBoard());
      setLastPlaced(null);
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
      setLastPlaced(msg.index);
      playCue('select');
      return next;
    });
  });

  const commitMove = useCallback(
    (index: number) => {
      setBoard((prev) => {
        if (winner(prev) || prev[index] || currentMark(prev) !== myMark) return prev;
        const next = [...prev];
        next[index] = myMark;
        scoreBoard(next, myMark);
        setLastPlaced(index);
        return next;
      });
      playCue('select');
      hapticSuccess();
      send({ kind: 'move', index, gen });
    },
    [myMark, scoreBoard, gen, send],
  );

  const play = (index: number) => {
    if (!myTurn || board[index]) return;
    commitMove(index);
  };

  const rematch = () => {
    const nextGen = gen + 1;
    setGen(nextGen);
    setBoard(emptyBoard());
    setLastPlaced(null);
    playCue('click');
    publishBoard(emptyBoard(), nextGen);
    send({ kind: 'rematch', gen: nextGen });
  };

  // --- Spectator sync: follow the host's mirrored board straight from shared state. ---
  const specShared = (sharedState as TttShared | null)?.ttt ?? null;
  useEffect(() => {
    if (!isSpectator || !specShared) return;
    setBoard(specShared.board);
    setGen(specShared.gen);
  }, [isSpectator, specShared]);

  // Host mirrors the live board into shared state whenever it changes, so
  // spectators and late joiners stay in sync. usePublishState owns the
  // effect + loop-safe ref handling.
  usePublishState(role === 'host', [board, gen], () => publishBoard(board, gen));

  // --- Per-turn countdown timer (players only). Auto-plays the lowest empty
  //     cell if the local player lets their clock run out, keeping play moving
  //     without stalling the match. Deterministic so the relayed move is legal. ---
  const [remaining, setRemaining] = useState(TURN_SECONDS);
  const commitRef = useRef(commitMove);
  commitRef.current = commitMove;
  const boardRef = useRef(board);
  boardRef.current = board;

  useEffect(() => {
    if (isSpectator || over) return;
    // Reset the clock at the start of each turn / whenever the board advances.
    setRemaining(TURN_SECONDS);
    if (!myTurn) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      const left = TURN_SECONDS - Math.floor((Date.now() - started) / 1000);
      if (left <= 0) {
        window.clearInterval(id);
        setRemaining(0);
        const idx = autoMoveIndex(boardRef.current);
        if (idx >= 0) commitRef.current(idx);
      } else {
        setRemaining(left);
        if (left <= 3) playCue('tick');
      }
    }, 250);
    return () => window.clearInterval(id);
    // Re-arm whenever the turn flips or the board count changes.
  }, [isSpectator, over, myTurn, turn]);

  // --- End-of-match effects: sound, haptics, confetti (fired once per settled board). ---
  const iWon = win === myMark;
  const [confetti, setConfetti] = useState(false);
  const endHandledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!over) {
      endHandledRef.current = null;
      setConfetti(false);
      return;
    }
    // Key the one-shot by generation + outcome so a rematch re-arms it.
    const key = `${gen}:${win ?? 'draw'}`;
    if (endHandledRef.current === key) return;
    endHandledRef.current = key;
    if (isSpectator) {
      playCue('win');
      return;
    }
    if (win) {
      if (iWon) {
        playCue('win');
        hapticSuccess();
        setConfetti(true);
      } else {
        playCue('lose');
        hapticError();
      }
    } else {
      playCue('draw');
    }
  }, [over, win, gen, iWon, isSpectator]);

  // --- Match reporting: host writes the finished duel exactly once per generation. ---
  const reportedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!over || reportedRef.current === gen) return;
    const host = players.find((p) => p.role === 'host');
    const guest = players.find((p) => p.role === 'guest');
    if (!host || !guest) return; // need both seats filled to record a duel
    reportedRef.current = gen;
    const hostWon = win === 'X';
    const guestWon = win === 'O';
    void report([
      { peerId: host.id, placement: win ? (hostWon ? 1 : 2) : 1 },
      { peerId: guest.id, placement: win ? (guestWon ? 1 : 2) : 1 },
    ]);
  }, [over, gen, win, players, report]);

  if (!connected && !isSpectator) {
    return (
      <WaitingForPeer message={`Waiting for ${peer?.name ?? strings.partner} to reconnect…`} />
    );
  }

  const meName = self?.name ?? strings.you;
  const peerName = peer?.name ?? strings.partner;
  const turnName = turn === myMark ? meName : peerName;
  const timerProgress = TURN_SECONDS > 0 ? remaining / TURN_SECONDS : 0;
  const timerTone = remaining <= 3 ? 'bad' : remaining <= 6 ? 'accent' : 'good';

  return (
    <GameBody>
      <Scoreboard
        me={meName}
        peer={peerName}
        myMark={myMark}
        myScore={tally.me}
        peerScore={tally.peer}
        draws={tally.draws}
        drawsLabel={strings.draws}
        isSpectator={isSpectator}
      />

      {isSpectator ? (
        <div className="flex justify-center">
          <TurnBadge tone="wait">
            <Eye className="h-3.5 w-3.5" /> {strings.watching}
          </TurnBadge>
        </div>
      ) : over ? (
        <ResultBanner
          tone={win ? (iWon ? 'win' : 'lose') : 'draw'}
          title={win ? (iWon ? strings.youWin : strings.peerWins(peerName)) : strings.draw}
          detail={win ? strings.completesLine(win) : strings.boardFull}
        />
      ) : (
        <div className="flex items-center justify-center gap-2">
          <CountdownRing
            progress={timerProgress}
            tone={myTurn ? timerTone : 'accent'}
            size={36}
            label={String(remaining)}
          />
          <TurnBadge tone={myTurn ? 'you' : 'peer'}>
            {myTurn ? strings.yourMove(myMark) : strings.peerMove(peerName, turn)}
          </TurnBadge>
        </div>
      )}

      {/* Spectator turn hint sits below the watching badge. */}
      {isSpectator && !over && (
        <div className="flex justify-center">
          <TurnBadge tone="peer">{strings.spectatorTurn(turnName, turn)}</TurnBadge>
        </div>
      )}

      <div className="relative">
        <GameArena accent="#0ea5e9" className="p-2">
        <div
          className="grid grid-cols-3 gap-1.5"
          role="grid"
          aria-label="tic-tac-toe board"
        >
          {board.map((cell, i) => (
            <Cell
              key={i}
              mark={cell}
              highlighted={line !== null && line.includes(i)}
              justPlaced={lastPlaced === i}
              disabled={!myTurn || cell !== null}
              reduced={reduced}
              onClick={() => play(i)}
            />
          ))}
        </div>
        {line && <WinningStroke line={line} reduced={reduced} />}
        </GameArena>
        <Confetti fire={confetti} />
      </div>

      {over && !isSpectator && (
        <TouchButton variant="primary" size="md" className="w-full" onClick={rematch}>
          {strings.playAgain}
        </TouchButton>
      )}
    </GameBody>
  );
}

/**
 * SVG line drawn from the first to the last cell of the winning triple, with a
 * stroke-dash "draw-on" animation. Positions are cell-center percentages on the
 * 3×3 grid, so it overlays perfectly regardless of board pixel size.
 */
function WinningStroke({
  line,
  reduced,
}: {
  line: readonly [number, number, number];
  reduced: boolean;
}) {
  const center = (idx: number) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    // Cell centers at 1/6, 3/6, 5/6 of each axis.
    return { x: ((col * 2 + 1) / 6) * 100, y: ((row * 2 + 1) / 6) * 100 };
  };
  const a = center(line[0]);
  const b = center(line[2]);
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke="var(--good)"
        strokeWidth={2.4}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={
          reduced
            ? undefined
            : {
                strokeDasharray: 200,
                strokeDashoffset: 200,
                animation: 'ttt-strike 0.45s ease-out forwards',
              }
        }
      />
      {/* Keyframes are inlined so the game folder stays self-contained. */}
      <style>{'@keyframes ttt-strike{to{stroke-dashoffset:0}}'}</style>
    </svg>
  );
}

function Cell({
  mark,
  highlighted,
  justPlaced,
  disabled,
  reduced,
  onClick,
}: {
  mark: Mark | null;
  highlighted: boolean;
  justPlaced: boolean;
  disabled: boolean;
  reduced: boolean;
  onClick: () => void;
}) {
  // Freshly placed marks pop in; existing ones render statically (no re-animate).
  const animate = mark && justPlaced && !reduced;
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
      <span
        className="flex h-2/3 w-2/3 items-center justify-center"
        style={
          animate
            ? { animation: 'ttt-pop 0.22s cubic-bezier(0.34,1.56,0.64,1)' }
            : undefined
        }
      >
        {mark === 'X' && <X className="h-full w-full text-accent" strokeWidth={2.5} />}
        {mark === 'O' && <Circle className="h-[90%] w-[90%] text-ink" strokeWidth={2.5} />}
      </span>
      <style>{'@keyframes ttt-pop{from{transform:scale(0.2);opacity:0}to{transform:scale(1);opacity:1}}'}</style>
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
  drawsLabel,
  isSpectator,
}: {
  me: string;
  peer: string;
  myMark: Mark;
  myScore: number;
  peerScore: number;
  draws: number;
  drawsLabel: string;
  isSpectator: boolean;
}) {
  const peerMark: Mark = myMark === 'X' ? 'O' : 'X';
  return (
    <div className="flex items-stretch justify-center gap-2 text-center">
      <Tally name={me} mark={myMark} score={myScore} accent={!isSpectator} />
      <div className="flex flex-col items-center justify-center px-1">
        <div className="font-mono text-[10px] uppercase tracking-wide text-ink3">{drawsLabel}</div>
        <div className="font-mono text-lg font-bold tabular-nums text-ink2">{draws}</div>
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
      <div className="flex items-center justify-center gap-1.5">
        <Avatar seed={name} name={name} size={20} />
        <div className="truncate text-xs font-semibold text-ink">
          {name} <span className="text-ink3">({mark})</span>
        </div>
      </div>
      <div
        className={cn(
          'font-mono text-xl font-bold tabular-nums',
          accent ? 'text-accent' : 'text-ink2',
        )}
      >
        {score}
      </div>
    </div>
  );
}

export default TicTacToe;
