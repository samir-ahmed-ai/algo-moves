import { useEffect, useState } from 'react';
import { ArrowLeft, Home, LogOut, Moon, Sun, Users, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useWorkspace } from '../../lib/workspace';
import { GameRoomProvider, useGameRoom } from './net/useGameRoom';
import { parseGamesHash } from './engine/gamesHash';
import { GAMES, getGame } from './registry';
import { Lobby } from './lobby/Lobby';
import { ShareRoom } from './lobby/ShareRoom';
import { Glyph } from './ui/gamesUi';
import { hasConfiguredServer } from './net/gameServer';
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
  const { status, room, peer, self, role, sharedState, publishState, disconnect, reconnecting } = useGameRoom();
  const [prefillRoom] = useState(() =>
    typeof location === 'undefined' ? undefined : parseGamesHash(location.hash)?.room,
  );
  const [partnerLeft, setPartnerLeft] = useState(false);

  const currentGame = getGame(selectedGameId(sharedState));
  const open = status === 'open';
  const isHost = role === 'host';
  // `live` stays true during a transient reconnect so the game view is not torn
  // down (and its state lost) by a brief network blip.
  const live = open || reconnecting;
  const bothHere = live && peer !== null;
  const inGame = live && currentGame !== undefined && (bothHere || partnerLeft);

  useEffect(() => {
    if (peer !== null) setPartnerLeft(false);
  }, [peer]);

  useEffect(() => {
    if (live && peer === null && currentGame) setPartnerLeft(true);
  }, [live, peer, currentGame]);

  const selectGame = (id: string) => {
    if (!isHost) return;
    publishState({ ...(sharedState as object | null), game: id });
  };
  const backToPicker = () => {
    if (!isHost) return;
    publishState({ ...(sharedState as object | null), game: null });
    setPartnerLeft(false);
  };

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
            className="grid h-11 w-11 place-items-center rounded-md border border-edge text-ink3 hover:bg-panel2 hover:text-ink"
          >
            <Home className="h-4 w-4" />
          </button>

          {currentGame && inGame && isHost ? (
            <button
              type="button"
              onClick={backToPicker}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-edge px-3 py-1.5 text-sm text-ink2 hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" /> Games
            </button>
          ) : currentGame && inGame ? (
            <span className="font-semibold tracking-tight">{currentGame.title}</span>
          ) : (
            <span className="font-semibold tracking-tight">Games</span>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {room ? <RoomPill room={room} open={open} reconnecting={reconnecting} filled={bothHere} /> : null}
            <button
              type="button"
              title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="grid h-11 w-11 place-items-center rounded-md border border-edge text-ink3 hover:bg-panel2 hover:text-ink"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {live ? (
              <button
                type="button"
                title="Leave room"
                onClick={leave}
                className="grid h-11 w-11 place-items-center rounded-md border border-edge text-ink3 hover:border-bad/50 hover:text-bad"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {reconnecting ? (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-[var(--radius)] border border-edge bg-panel2 px-3 py-2 text-sm text-ink3">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--edge-active)' }} />
            Reconnecting…
          </div>
        ) : null}
        {!live ? (
          <Lobby prefillRoom={prefillRoom} />
        ) : inGame && currentGame ? (
          <>
            {partnerLeft ? (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 flex flex-col gap-2 rounded-[var(--radius)] border border-amber-400/40 bg-amber-500/10 px-3 py-3 text-sm text-ink2"
              >
                <span className="font-semibold text-ink">Your partner left.</span>
                <span>
                  The game stays on screen while you wait. Share the room code again, or{' '}
                  {isHost ? 'tap Games above to pick another.' : 'ask the host to pick another game.'}
                </span>
              </div>
            ) : null}
            <GameFrame game={currentGame} selfName={self?.name} peerName={peer?.name} />
          </>
        ) : !bothHere ? (
          <WaitingRoom room={room ?? ''} partnerLeft={partnerLeft} />
        ) : (
          <GamePicker onPick={selectGame} selfName={self?.name} peerName={peer?.name} isHost={isHost} />
        )}
      </main>
    </>
  );
}

function RoomPill({
  room,
  open,
  reconnecting,
  filled,
}: {
  room: string;
  open: boolean;
  reconnecting: boolean;
  filled: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-semibold',
        reconnecting
          ? 'border-edge bg-panel2 text-ink3'
          : filled
            ? 'border-good/40 bg-good/10 text-good'
            : 'border-edge bg-panel2 text-ink2',
      )}
    >
      {open ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {room}
      <span className="opacity-70">· {filled ? '2/2' : '1/2'}</span>
    </span>
  );
}

function WaitingRoom({ room, partnerLeft }: { room: string; partnerLeft?: boolean }) {
  const serverHint = hasConfiguredServer()
    ? 'Both devices need internet access to reach the deployed game server.'
    : "Both devices need to reach the game server. On the same Wi-Fi, open this site on the host's IP and run make backend-dev.";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 animate-pulse place-items-center rounded-full bg-accentbg text-accent">
          <Users className="h-6 w-6" />
        </span>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-ink">
          {partnerLeft ? 'Your partner left the room' : 'Waiting for your partner…'}
        </h2>
        <p className="mt-1 text-sm text-ink2">
          {partnerLeft
            ? 'Share the code again — the game resumes when they rejoin.'
            : 'Share this code — the game starts the moment they join.'}
        </p>
      </div>
      <ShareRoom room={room} hint={serverHint} />
    </div>
  );
}

function GamePicker({
  onPick,
  selfName,
  peerName,
  isHost,
}: {
  onPick: (id: string) => void;
  selfName?: string;
  peerName?: string;
  isHost: boolean;
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
      <p className="mb-6 text-center text-sm text-ink3">
        {isHost ? 'Choose a game — it opens on both screens.' : 'Waiting for the host to pick a game…'}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} onClick={() => onPick(game.id)} disabled={!isHost} />
        ))}
      </div>
    </div>
  );
}

function GameCard({ game, onClick, disabled }: { game: GameDef; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex items-center gap-4 rounded-[var(--radius)] border border-edge bg-panel/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
