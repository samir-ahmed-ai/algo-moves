import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Eye, Play, Users } from 'lucide-react';
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

  if (!currentGame) return <Staging>{role === 'host' ? <GameChooser /> : <WaitingForHost />}</Staging>;
  if (!started) return <Staging game={currentGame}><ReadyRoom game={currentGame} /></Staging>;
  return <PlayArea game={currentGame} />;
}

/** Shared staging shell: roster on top, the inner step, then invite + chat. */
function Staging({ game, children }: { game?: GameDef; children: ReactNode }) {
  const { locale } = useGamesLocale();
  const t = useArcadeStrings();
  const { room } = useGameRoom();
  const serverHint = hasConfiguredServer() ? t.waitingRoom.serverHintDeployed : t.waitingRoom.serverHintLan;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-2.5">
      <Roster />
      <div className="rounded-xl border border-edge bg-panel/60 p-3">{children}</div>
      {!game ? <ShareRoom room={room ?? ''} hint={serverHint} locale={locale} /> : null}
      <ChatDock />
    </div>
  );
}

function WaitingForHost() {
  const t = useArcadeStrings();
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="grid h-12 w-12 animate-pulse place-items-center rounded-full bg-accentbg text-accent">
        <Users className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium text-ink2">{t.picker.guestHint}</p>
    </div>
  );
}

function ReadyRoom({ game }: { game: GameDef }) {
  const { locale } = useGamesLocale();
  const t = useArcadeStrings();
  const { players, playerCount, role, isSpectator, sharedState, publishState, capacity } = useGameRoom();
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
    <div className="flex flex-col items-center gap-4 text-center">
      <span
        className="grid h-16 w-16 place-items-center rounded-3xl shadow-lg"
        style={{ background: `${color}20`, color }}
      >
        <Glyph markup={game.glyph} className="h-9 w-9" />
      </span>
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-ink">{meta.title}</h2>
        <p className="text-xs text-ink3 mt-1">{meta.tagline}</p>
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
        <p className="text-sm text-ink3">{t.room.needMorePlayers(cap.min - playerCount)}</p>
      ) : allReady ? (
        <p className="text-sm font-semibold text-good">{t.room.everyoneReady}</p>
      ) : (
        <p className="text-sm text-ink3">{t.room.waitingForPlayers}</p>
      )}

      {isHost ? (
        <div className="flex w-full max-w-xs flex-col gap-2">
          <TouchButton variant="primary" size="md" disabled={!canStart} onClick={start} icon={<Play className="h-4 w-4" />} className="w-full">
            {t.room.start}
          </TouchButton>
          <button type="button" onClick={changeGame} className="inline-flex min-h-10 items-center justify-center gap-1.5 text-xs text-ink3 hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" /> {t.room.changeGame}
          </button>
        </div>
      ) : null}

      <SessionStandings />

      <p className="text-[11px] text-ink3">{t.room.playersHere(playerCount, capacity)}</p>
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
    <div className="w-full rounded-2xl border border-edge bg-panel/50 p-3 text-start">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink3">{t.room.standings}</p>
      <ul className="flex flex-col gap-2">
        {ranked.map(({ p, wins }, i) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <span className="w-5 text-center text-sm">
              {wins > 0 && wins === topWins && i === 0 ? '👑' : <span className="text-xs font-bold text-ink3">{i + 1}</span>}
            </span>
            <Avatar seed={p.id} name={p.name} size={22} />
            <span className="min-w-0 flex-1 truncate font-medium text-ink">{p.name}</span>
            <span className="font-bold tabular-nums text-accent">{wins}</span>
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
    <div className="flex flex-col items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-panel2 px-3 py-1 text-sm text-ink2">
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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <Roster compact />
        {isHost ? (
          <button
            type="button"
            onClick={changeGame}
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-edge px-2.5 py-1 text-xs text-ink3 hover:text-ink touch-manipulation"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t.room.changeGame}
          </button>
        ) : null}
      </div>

      <div
        className="relative rounded-xl border-2 bg-gradient-to-b from-panel/90 to-panel/40 p-3"
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
    <div className="flex flex-col items-center gap-3 py-6">
      <span key={n} className="text-4xl animate-countdown-pop">
        {n > 0 ? emoji : '🚀'}
      </span>
      <CountdownRing progress={n / 3} size={64} tone="accent" label={n > 0 ? String(n) : '·'} />
      <p className="text-sm font-semibold" style={{ color: accent ?? 'var(--ink-2)' }}>
        {title}
      </p>
    </div>
  );
}
