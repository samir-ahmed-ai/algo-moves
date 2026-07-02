import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Eye, Play, Users } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { playCue } from '@/lib/utils/audio';
import { getArcadeStrings, useGamesLocale } from '../locale';
import { useGameRoom } from '../net/useGameRoom';
import { useRoomComms } from '../net/useRoomComms';
import { getGame, GAMES } from '../registry';
import { gameCapacity, type GameDef } from '../types';
import { localizedGameMeta } from '../gameMeta';
import { hasConfiguredServer } from '../net/gameServer';
import { Glyph, TouchButton } from '../ui/gamesUi';
import { CountdownRing } from '../ui/effects';
import { Avatar } from '../ui/Avatar';
import { ShareRoom } from '../lobby/ShareRoom';
import { Roster } from './Roster';
import { ChatDock } from './ChatDock';
import type { RoomMode } from '../data/types';

interface RoomState {
  game?: string | null;
  mode?: RoomMode;
  locale?: string;
  started?: boolean;
}

/** The full in-room experience: choose → ready up → countdown → play, wrapped
 * with a live roster, invite card and chat for players and spectators alike. */
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
function Staging({ game, children }: { game?: GameDef; children: React.ReactNode }) {
  const { locale } = useGamesLocale();
  const { room } = useGameRoom();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const serverHint = hasConfiguredServer() ? t.waitingRoom.serverHintDeployed : t.waitingRoom.serverHintLan;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <Roster />
      <div className="rounded-[var(--radius)] border border-edge bg-panel/60 p-4">{children}</div>
      {!game ? <ShareRoom room={room ?? ''} hint={serverHint} locale={locale} /> : null}
      <ChatDock />
    </div>
  );
}

function WaitingForHost() {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="grid h-10 w-10 animate-pulse place-items-center rounded-full bg-accentbg text-accent">
        <Users className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-ink2">{t.picker.guestHint}</p>
    </div>
  );
}

function GameChooser() {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { publishState, sharedState, capacity, playerCount } = useGameRoom();

  const choose = (game: GameDef) => {
    playCue('select');
    publishState({
      ...(sharedState as object | null),
      game: game.id,
      mode: capacity > 2 ? 'ffa' : 'duel',
      locale,
      started: false,
    });
  };

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-bold tracking-tight text-ink">{t.room.chooseGame}</h2>
      <p className="mb-4 text-center text-sm text-ink3">{t.room.playersHere(playerCount, capacity)}</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {GAMES.map((game) => {
          const cap = gameCapacity(game);
          const fits = playerCount >= cap.min && playerCount <= cap.max;
          const meta = localizedGameMeta(game, locale);
          return (
            <button
              key={game.id}
              type="button"
              disabled={!fits}
              onClick={() => choose(game)}
              className={cn(
                'group flex items-center gap-3 rounded-[var(--radius)] border border-edge bg-panel/70 p-3 text-start transition-all',
                fits ? 'hover:-translate-y-0.5 hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-md)]' : 'cursor-not-allowed opacity-45',
              )}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accentbg text-accent">
                <Glyph markup={game.glyph} className="h-7 w-7" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{meta.title}</span>
                <span className="mt-0.5 block truncate text-xs text-ink3">
                  {fits ? meta.tagline : `${cap.min === cap.max ? cap.min : `${cap.min}–${cap.max}`} ${t.room.players.toLowerCase()}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReadyRoom({ game }: { game: GameDef }) {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { players, playerCount, role, isSpectator, sharedState, publishState, capacity } = useGameRoom();
  const { ready, setReady, readyIds } = useRoomComms();
  const meta = localizedGameMeta(game, locale);
  const cap = gameCapacity(game);
  const isHost = role === 'host';

  // Each fresh match requires re-readying.
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
    publishState({ ...(sharedState as object | null), started: true });
  };
  const changeGame = () => {
    playCue('click');
    publishState({ ...(sharedState as object | null), game: null, started: false });
  };

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accentbg text-accent">
        <Glyph markup={game.glyph} className="h-8 w-8" />
      </span>
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">{meta.title}</h2>
        <p className="text-xs text-ink3">{meta.tagline}</p>
      </div>

      {isSpectator ? (
        <SpectatorControls />
      ) : (
        <TouchButton
          variant={ready ? 'good' : 'accentSoft'}
          size="lg"
          onClick={() => {
            playCue('click');
            setReady(!ready);
          }}
        >
          {ready ? t.room.ready + ' ✓' : t.room.readyUp}
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
        <div className="flex w-full flex-col gap-2">
          <TouchButton variant="primary" size="lg" disabled={!canStart} onClick={start} icon={<Play className="h-4 w-4" />}>
            {t.room.start}
          </TouchButton>
          <button type="button" onClick={changeGame} className="inline-flex min-h-9 items-center justify-center gap-1 text-xs text-ink3 hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" /> {t.room.changeGame}
          </button>
        </div>
      ) : null}

      <SessionStandings />

      <p className="text-[11px] text-ink3">{t.room.playersHere(playerCount, capacity)}</p>
    </div>
  );
}

/** Running win tally across the room's matches this session (persists between rematches). */
function SessionStandings() {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { players } = useGameRoom();
  const { standings } = useRoomComms();
  const total = Object.values(standings).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const ranked = [...players]
    .map((p) => ({ p, wins: standings[p.id] ?? 0 }))
    .sort((a, b) => b.wins - a.wins);

  return (
    <div className="w-full rounded-[var(--radius)] border border-edge bg-panel/50 p-3 text-start">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">{t.room.standings}</p>
      <ul className="flex flex-col gap-1.5">
        {ranked.map(({ p, wins }, i) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <span className="w-4 text-center text-xs font-bold tabular-nums text-ink3">{i + 1}</span>
            <Avatar seed={p.id} name={p.name} size={22} />
            <span className="min-w-0 flex-1 truncate text-ink">{p.name}</span>
            <span className="font-semibold tabular-nums text-accent">{wins}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpectatorControls() {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
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
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { role, sharedState, publishState } = useGameRoom();
  const meta = localizedGameMeta(game, locale);
  const Component = game.Component;
  const isHost = role === 'host';
  const [counting, setCounting] = useState(true);

  const changeGame = () => {
    playCue('click');
    publishState({ ...(sharedState as object | null), game: null, started: false });
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Roster compact />
        {isHost ? (
          <button
            type="button"
            onClick={changeGame}
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-edge px-2.5 py-1 text-xs text-ink3 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t.room.changeGame}
          </button>
        ) : null}
      </div>

      <div className="relative rounded-[var(--radius)] border border-edge bg-panel/40 p-4">
        {counting ? (
          <StartCountdown title={meta.title} onDone={() => setCounting(false)} />
        ) : (
          <Component />
        )}
      </div>

      <ChatDock />
    </div>
  );
}

/** A brief synchronized 3-2-1 before the game surface mounts. */
function StartCountdown({ title, onDone }: { title: string; onDone: () => void }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n <= 0) {
      playCue('go');
      const t = setTimeout(onDone, 250);
      return () => clearTimeout(t);
    }
    playCue('countdown');
    const t = setTimeout(() => setN((v) => v - 1), 700);
    return () => clearTimeout(t);
  }, [n, onDone]);

  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <CountdownRing progress={n / 3} size={72} tone="accent" label={n > 0 ? String(n) : '·'} />
      <p className="text-sm font-medium text-ink2">{title}</p>
    </div>
  );
}
