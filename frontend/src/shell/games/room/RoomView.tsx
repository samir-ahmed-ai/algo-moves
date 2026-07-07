import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Eye, Play, Trophy, Users } from 'lucide-react';
import { playCue } from '@/lib/utils/audio';
import { useArcadeStrings, useGamesLocale } from '../locale';
import { useGameRoom } from '../net/useGameRoom';
import { useRoomComms } from '../net/useRoomComms';
import { getGame } from '../registry';
import { gameCapacity, type GameDef } from '../types';
import { localizedGameMeta } from '../gameMeta';
import { gameAccentColor, gameEmoji } from '../gamePresentation';
import { hasConfiguredServer } from '../net/gameServer';
import { Glyph, TouchButton } from '../ui/gamesUi';
import { CountdownRing } from '../ui/effects';
import { Avatar } from '../ui/Avatar';
import { ShareRoom } from '../lobby/ShareRoom';
import { GameChooser } from './GameChooser';
import { Roster } from './Roster';
import { ChatDock } from './ChatDock';
import { patchRoomState, type RoomState } from './roomState';

/** The full in-room experience: choose → ready up → countdown → play. */
export function RoomView() {
  const { sharedState, role } = useGameRoom();
  const ss = (sharedState ?? {}) as RoomState;
  const currentGame = getGame(ss.game);
  const started = ss.started === true && !!currentGame;

  if (!currentGame)
    return <Staging>{role === 'host' ? <GameChooser /> : <WaitingForHost />}</Staging>;
  if (!started)
    return (
      <Staging game={currentGame}>
        <ReadyRoom game={currentGame} />
      </Staging>
    );
  return <PlayArea game={currentGame} />;
}

/** Shared staging shell: roster on top, the inner step, then invite + chat. */
function Staging({ game, children }: { game?: GameDef; children: ReactNode }) {
  const { locale } = useGamesLocale();
  const t = useArcadeStrings();
  const { room } = useGameRoom();
  const serverHint = hasConfiguredServer()
    ? t.waitingRoom.serverHintDeployed
    : t.waitingRoom.serverHintLan;

  return (
    <div className="game-room-stage mx-auto flex w-full max-w-xl flex-col gap-3 p-4 sm:p-5">
      <Roster />
      <div className="game-room-stage__card rounded-[1.75rem] border border-white/60 bg-white/76 p-4 shadow-[0_18px_64px_rgba(15,23,42,0.1)] backdrop-blur dark:border-white/10 dark:bg-white/5">
        {children}
      </div>
      {!game ? <ShareRoom room={room ?? ''} hint={serverHint} locale={locale} /> : null}
      <ChatDock />
    </div>
  );
}

function WaitingForHost() {
  const t = useArcadeStrings();
  return (
    <div className="game-waiting-host flex flex-col items-center gap-4 py-10 text-center">
      <span className="game-waiting-host__icon grid h-14 w-14 animate-pulse place-items-center rounded-3xl border border-cyan-300/35 bg-cyan-100/80 text-cyan-700 shadow-[0_14px_40px_rgba(8,145,178,0.18)] dark:bg-cyan-300/10 dark:text-cyan-100">
        <Users className="h-6 w-6" />
      </span>
      <p className="max-w-xs text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
        {t.picker.guestHint}
      </p>
    </div>
  );
}

function ReadyRoom({ game }: { game: GameDef }) {
  const { locale } = useGamesLocale();
  const t = useArcadeStrings();
  const { players, playerCount, role, isSpectator, sharedState, publishState, capacity } =
    useGameRoom();
  const { ready, setReady, readyIds } = useRoomComms();
  const meta = localizedGameMeta(game, locale);
  const cap = gameCapacity(game);
  const isHost = role === 'host';
  const color = gameAccentColor(game);

  const cleared = useRef(false);
  useEffect(() => {
    if (!cleared.current) {
      setReady(false);
      cleared.current = true;
    }
  }, [setReady]);

  const enoughPlayers = playerCount >= cap.min;
  const allReady = players.length > 0 && players.every((p) => readyIds.has(p.id));
  const canStart = isHost && enoughPlayers && allReady;

  const start = () => {
    playCue('countdown');
    publishState(patchRoomState(sharedState, { started: true }));
  };

  const changeGame = () => {
    playCue('click');
    publishState(patchRoomState(sharedState, { game: null, started: false }));
  };

  return (
    <div className="game-ready-room flex flex-col items-center gap-4 py-2 text-center">
      <span
        className="game-ready-room__glyph grid h-20 w-20 place-items-center rounded-[1.75rem] border border-white/60 shadow-[0_20px_56px_rgba(15,23,42,0.16)] dark:border-white/10"
        style={{ background: `${color}20`, color }}
      >
        <Glyph markup={game.glyph} className="h-10 w-10" />
      </span>
      <div className="game-ready-room__copy">
        <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          {meta.title}
        </h2>
        <p className="mt-1 max-w-sm text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
          {meta.tagline}
        </p>
      </div>

      {isSpectator ? (
        <SpectatorControls />
      ) : (
        <TouchButton
          variant={ready ? 'good' : 'accentSoft'}
          size="md"
          onClick={() => {
            playCue('click');
            setReady(!ready);
          }}
          className="w-full max-w-xs"
        >
          {ready ? `${t.room.ready} ✓` : t.room.readyUp}
        </TouchButton>
      )}

      {!enoughPlayers ? (
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {t.room.needMorePlayers(cap.min - playerCount)}
        </p>
      ) : allReady ? (
        <p className="rounded-full border border-emerald-300/40 bg-emerald-100/80 px-3 py-1 text-sm font-black text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100">
          {t.room.everyoneReady}
        </p>
      ) : (
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {t.room.waitingForPlayers}
        </p>
      )}

      {isHost ? (
        <div className="game-ready-room__host-actions flex w-full max-w-xs flex-col gap-2">
          <TouchButton
            variant="primary"
            size="md"
            disabled={!canStart}
            onClick={start}
            icon={<Play className="h-4 w-4" />}
            className="w-full"
          >
            {t.room.start}
          </TouchButton>
          <button
            type="button"
            onClick={changeGame}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl text-xs font-bold text-slate-500 transition hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t.room.changeGame}
          </button>
        </div>
      ) : null}

      <SessionStandings />

      <p className="game-ready-room__capacity text-[length:var(--fs-tight)] font-semibold text-slate-500 dark:text-slate-400">
        {t.room.playersHere(playerCount, capacity)}
      </p>
    </div>
  );
}

/** Running win tally across the room's matches this session. */
function SessionStandings() {
  const t = useArcadeStrings();
  const { players } = useGameRoom();
  const { standings } = useRoomComms();
  const total = Object.values(standings).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const ranked = [...players]
    .map((p) => ({ p, wins: standings[p.id] ?? 0 }))
    .sort((a, b) => b.wins - a.wins);

  const topWins = ranked[0]?.wins ?? 0;

  return (
    <div className="game-standings w-full rounded-3xl border border-white/60 bg-white/70 p-3 text-start shadow-sm dark:border-white/10 dark:bg-white/5">
      <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {t.room.standings}
      </p>
      <ul className="flex flex-col gap-2">
        {ranked.map(({ p, wins }, i) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <span className="grid w-5 place-items-center text-sm">
              {wins > 0 && wins === topWins && i === 0 ? (
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <span className="text-xs font-black text-slate-400">{i + 1}</span>
              )}
            </span>
            <Avatar seed={p.id} name={p.name} size={22} />
            <span className="min-w-0 flex-1 truncate font-bold text-slate-800 dark:text-slate-100">
              {p.name}
            </span>
            <span className="font-black tabular-nums text-cyan-700 dark:text-cyan-200">{wins}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpectatorControls() {
  const t = useArcadeStrings();
  const { playerCount, capacity, requestSeat } = useGameRoom();
  const seatFree = playerCount < capacity;
  return (
    <div className="game-spectator-controls flex flex-col items-center gap-2">
      <span className="game-spectator-controls__badge inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-sm font-bold text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        <Eye className="h-4 w-4" /> {t.room.spectating}
      </span>
      {seatFree ? (
        <TouchButton variant="accentSoft" size="md" onClick={() => requestSeat('player')}>
          {t.room.joinAsPlayer}
        </TouchButton>
      ) : (
        <span className="text-xs text-ink3">{t.room.seatsFull}</span>
      )}
    </div>
  );
}

function PlayArea({ game }: { game: GameDef }) {
  const { locale } = useGamesLocale();
  const t = useArcadeStrings();
  const { role, sharedState, publishState } = useGameRoom();
  const meta = localizedGameMeta(game, locale);
  const Component = game.Component;
  const isHost = role === 'host';
  const [counting, setCounting] = useState(true);
  const finishCountdown = useCallback(() => setCounting(false), []);
  const accent = gameAccentColor(game);

  const changeGame = () => {
    playCue('click');
    publishState(patchRoomState(sharedState, { game: null, started: false }));
  };

  return (
    <div className="game-play-shell mx-auto flex w-full max-w-xl flex-col gap-3 p-4 sm:p-5">
      <div className="game-play-shell__top flex items-center justify-between gap-2">
        <Roster compact />
        {isHost ? (
          <button
            type="button"
            onClick={changeGame}
            className="inline-flex min-h-9 shrink-0 touch-manipulation items-center gap-1 rounded-2xl border border-white/60 bg-white/70 px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t.room.changeGame}
          </button>
        ) : null}
      </div>

      <div
        className="game-play-arena relative overflow-hidden rounded-[2rem] border-2 bg-gradient-to-b from-white/90 to-white/62 p-4 shadow-[0_24px_76px_rgba(15,23,42,0.12)] backdrop-blur dark:from-slate-950/78 dark:to-slate-900/58 sm:p-5"
        style={{
          borderColor: `${accent}44`,
          boxShadow: `0 4px 28px -10px ${accent}33`,
        }}
      >
        {counting ? (
          <StartCountdown
            title={meta.title}
            emoji={gameEmoji(game.id)}
            accent={accent}
            onDone={finishCountdown}
          />
        ) : (
          <Component />
        )}
      </div>

      <ChatDock />
    </div>
  );
}

/** A brief synchronized 3-2-1 before the game surface mounts. */
function StartCountdown({
  title,
  emoji,
  accent,
  onDone,
}: {
  title: string;
  emoji: string;
  accent?: string;
  onDone: () => void;
}) {
  const [n, setN] = useState(3);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (n <= 0) {
      playCue('go');
      const timer = setTimeout(() => onDoneRef.current(), 300);
      return () => clearTimeout(timer);
    }
    playCue('countdown');
    const timer = setTimeout(() => setN((v) => v - 1), 700);
    return () => clearTimeout(timer);
  }, [n]);

  return (
    <div className="game-countdown flex flex-col items-center gap-3 py-8">
      <span
        key={n}
        className="animate-countdown-pop grid h-16 w-16 place-items-center rounded-[1.5rem] bg-white/70 text-4xl shadow-lg dark:bg-white/10"
      >
        {n > 0 ? emoji : 'GO'}
      </span>
      <CountdownRing progress={n / 3} size={64} tone="accent" label={n > 0 ? String(n) : '·'} />
      <p
        className="text-sm font-black uppercase tracking-[0.18em]"
        style={{ color: accent ?? 'var(--ink-2)' }}
      >
        {title}
      </p>
    </div>
  );
}
