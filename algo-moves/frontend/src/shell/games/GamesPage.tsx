import { useState } from 'react';
import { ArrowLeft, Home, LogOut, Moon, Sun, Users, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useWorkspace } from '../../lib/workspace';
import { GameRoomProvider, useGameRoom } from './net/useGameRoom';
import { parseGamesHash } from './engine/gamesHash';
import { GAMES, getGame } from './registry';
import { Lobby } from './lobby/Lobby';
import { ShareRoom } from './lobby/ShareRoom';
import { Glyph } from './ui/gamesUi';
import type { GameDef } from './types';

/** Read the shared room state's selected game id (host-authoritative). */
function selectedGameId(sharedState: unknown): string | null {
  if (sharedState && typeof sharedState === 'object' && 'game' in sharedState) {
    const g = (sharedState as { game?: unknown }).game;
    return typeof g === 'string' ? g : null;
  }
  return null;
}

export function GamesPage() {
  const { density } = useWorkspace();
  return (
    <GameRoomProvider>
      <div
        data-density={density}
        className="ws-scroll flex h-full w-full flex-col overflow-y-auto bg-bg text-ink [padding-bottom:env(safe-area-inset-bottom)]"
      >
        <Arcade />
      </div>
    </GameRoomProvider>
  );
}

function Arcade() {
  const { theme, setTheme, goHome } = useWorkspace();
  const { status, room, peer, self, sharedState, publishState, disconnect } = useGameRoom();
  const [prefillRoom] = useState(() =>
    typeof location === 'undefined' ? undefined : parseGamesHash(location.hash)?.room,
  );

  const currentGame = getGame(selectedGameId(sharedState));
  const open = status === 'open';
  const bothHere = open && peer !== null;

  const selectGame = (id: string) => publishState({ ...(sharedState as object | null), game: id });
  const backToPicker = () => publishState({ ...(sharedState as object | null), game: null });

  const leave = () => {
    disconnect();
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-edge bg-bg/85 backdrop-blur [padding-top:env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-2.5">
          <button
            type="button"
            title="Home"
            onClick={goHome}
            className="grid h-9 w-9 place-items-center rounded-md border border-edge text-ink3 hover:bg-panel2 hover:text-ink"
          >
            <Home className="h-4 w-4" />
          </button>

          {currentGame && bothHere ? (
            <button
              type="button"
              onClick={backToPicker}
              className="inline-flex items-center gap-1.5 rounded-md border border-edge px-2.5 py-1.5 text-sm text-ink2 hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" /> Games
            </button>
          ) : (
            <span className="font-semibold tracking-tight">Games</span>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {room ? <RoomPill room={room} open={open} filled={bothHere} /> : null}
            <button
              type="button"
              title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="grid h-9 w-9 place-items-center rounded-md border border-edge text-ink3 hover:bg-panel2 hover:text-ink"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {open ? (
              <button
                type="button"
                title="Leave room"
                onClick={leave}
                className="grid h-9 w-9 place-items-center rounded-md border border-edge text-ink3 hover:border-bad/50 hover:text-bad"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {!open ? (
          <Lobby prefillRoom={prefillRoom} />
        ) : !bothHere ? (
          <WaitingRoom room={room ?? ''} />
        ) : currentGame ? (
          <GameFrame game={currentGame} selfName={self?.name} peerName={peer?.name} />
        ) : (
          <GamePicker onPick={selectGame} selfName={self?.name} peerName={peer?.name} />
        )}
      </main>
    </>
  );
}

function RoomPill({ room, open, filled }: { room: string; open: boolean; filled: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-semibold',
        filled ? 'border-good/40 bg-good/10 text-good' : 'border-edge bg-panel2 text-ink2',
      )}
    >
      {open ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {room}
      <span className="opacity-70">· {filled ? '2/2' : '1/2'}</span>
    </span>
  );
}

function WaitingRoom({ room }: { room: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 animate-pulse place-items-center rounded-full bg-accentbg text-accent">
          <Users className="h-6 w-6" />
        </span>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-ink">Waiting for your partner…</h2>
        <p className="mt-1 text-sm text-ink2">Share this code — the game starts the moment they join.</p>
      </div>
      <ShareRoom
        room={room}
        hint="Both devices need to reach the game server. On the same Wi-Fi, open this site on the host's IP; over the internet, point VITE_GAMES_SERVER_URL at your deployed server."
      />
    </div>
  );
}

function GamePicker({
  onPick,
  selfName,
  peerName,
}: {
  onPick: (id: string) => void;
  selfName?: string;
  peerName?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-5 flex items-center justify-center gap-2 text-sm text-ink2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-good/10 px-3 py-1 font-medium text-good">
          <span className="h-1.5 w-1.5 rounded-full bg-good" />
          {selfName ?? 'You'} &amp; {peerName ?? 'Partner'} are in
        </span>
      </div>
      <h2 className="mb-1 text-center text-2xl font-bold tracking-tight text-ink">Pick a game</h2>
      <p className="mb-6 text-center text-sm text-ink3">Either of you can choose — it opens on both screens.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} onClick={() => onPick(game.id)} />
        ))}
      </div>
    </div>
  );
}

function GameCard({ game, onClick }: { game: GameDef; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-[var(--radius)] border border-edge bg-panel/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-md)]"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-accentbg text-accent">
        <Glyph markup={game.glyph} className="h-8 w-8" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{game.title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-ink2">{game.tagline}</span>
        <span className="mt-2 flex items-center gap-2 text-[11px] text-ink3">
          <span className="rounded-full bg-panel2 px-2 py-0.5 font-medium">
            {game.pace === 'simultaneous' ? 'Together' : 'Turns'}
          </span>
          <span>{game.minutes}</span>
        </span>
      </span>
    </button>
  );
}

function GameFrame({ game, selfName, peerName }: { game: GameDef; selfName?: string; peerName?: string }) {
  const Component = game.Component;
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-4 text-center">
        <h2 className="text-lg font-bold tracking-tight text-ink">{game.title}</h2>
        <p className="text-xs text-ink3">
          {selfName ?? 'You'} vs {peerName ?? 'Partner'}
        </p>
      </div>
      <Component />
    </div>
  );
}
