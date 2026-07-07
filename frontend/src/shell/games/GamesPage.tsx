import { useMemo, useState } from 'react';
import { Home, LogOut, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import { GamesLocaleProvider, getArcadeStrings, useGamesLocale, type GameLocale } from './locale';
import { GameRoomProvider, useGameRoom } from './net/useGameRoom';
import { RoomCommsProvider } from './net/useRoomComms';
import { AuthButton } from '@/shell/auth';
import { ToastProvider } from './ui/Toast';
import { useSoundMuted } from './ui/hooks';
import { ConnectionDot } from './ui/effects';
import { parseGamesHash } from '@/lib/navigation';
import { Lobby } from './lobby/Lobby';
import { RoomView } from './room/RoomView';
import { ProgressOverlay } from './progress/ProgressOverlay';
import { ensureSoundConfig } from './soundConfig';

export function GamesPage() {
  ensureSoundConfig();
  const { density } = useWorkspace();
  return (
    <GameRoomProvider>
      <GamesLocaleProvider>
        <ToastProvider>
          <div
            data-density={density}
            className="ws-scroll flex h-full w-full flex-col overflow-y-auto bg-bg text-ink [padding-bottom:env(safe-area-inset-bottom)]"
          >
            <Arcade />
          </div>
        </ToastProvider>
      </GamesLocaleProvider>
    </GameRoomProvider>
  );
}

function Arcade() {
  const { theme, setTheme, goHome } = useWorkspace();
  const { locale, setLocale, canChangeLocale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { status, room, capacity, playerCount, spectatorCount, disconnect, reconnecting } = useGameRoom();
  const [prefillRoom] = useState(() =>
    typeof location === 'undefined' ? undefined : parseGamesHash(location.hash, location.pathname)?.room,
  );
  const [muted, toggleMuted] = useSoundMuted();
  const [showProgress, setShowProgress] = useState(false);

  const open = status === 'open';
  const live = open || reconnecting;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-edge bg-bg/90 backdrop-blur-md [padding-top:env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            title={t.header.home}
            onClick={goHome}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-edge text-ink3 hover:bg-panel2 hover:text-ink touch-manipulation sm:h-11 sm:w-11"
          >
            <Home className="h-4 w-4" />
          </button>

          {/* Gradient title */}
          <span
            className="min-w-0 flex-1 truncate font-extrabold tracking-tight bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent select-none"
          >
            {t.header.games}
          </span>

          <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
            {room ? (
              <RoomPill
                room={room}
                open={open}
                reconnecting={reconnecting}
                players={playerCount}
                capacity={capacity}
                spectators={spectatorCount}
              />
            ) : null}

            <AuthButton compact onOpenProfile={() => setShowProgress(true)} />

            <IconButton
              title={muted ? t.room.soundOff : t.room.soundOn}
              onClick={toggleMuted}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </IconButton>

            <LanguageSelect locale={locale} disabled={!canChangeLocale} onChange={setLocale} labels={t.language} />

            <IconButton
              title={theme === 'dark' ? t.header.lightTheme : t.header.darkTheme}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </IconButton>

            {live ? (
              <IconButton title={t.header.leaveRoom} onClick={disconnect} danger>
                <LogOut className="h-4 w-4" />
              </IconButton>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 min-h-0 px-3 py-3 sm:px-4 sm:py-4">
        {reconnecting ? (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-2xl border border-edge bg-panel2 px-3 py-2.5 text-sm text-ink3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            {t.header.reconnecting}
          </div>
        ) : null}

        {!live ? (
          <Lobby prefillRoom={prefillRoom} />
        ) : (
          <RoomCommsProvider>
            <RoomView />
          </RoomCommsProvider>
        )}
      </main>

      {showProgress ? <ProgressOverlay onClose={() => setShowProgress(false)} /> : null}
    </>
  );
}

function IconButton({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'grid h-10 w-10 place-items-center rounded-xl border border-edge text-ink3 hover:bg-panel2 hover:text-ink touch-manipulation transition-colors sm:h-11 sm:w-11',
        danger && 'hover:border-bad/50 hover:text-bad',
      )}
    >
      {children}
    </button>
  );
}

function RoomPill({
  room,
  open,
  reconnecting,
  players,
  capacity,
  spectators,
}: {
  room: string;
  open: boolean;
  reconnecting: boolean;
  players: number;
  capacity: number;
  spectators: number;
}) {
  const filled = players >= 2;
  return (
    <span
      className={cn(
        'inline-flex min-w-0 max-w-[8rem] shrink items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-bold sm:max-w-none',
        reconnecting
          ? 'border-edge bg-panel2 text-ink3'
          : filled
            ? 'border-good/40 bg-good/10 text-good'
            : 'border-edge bg-panel2 text-ink2',
      )}
    >
      <ConnectionDot status={open ? 'open' : reconnecting ? 'connecting' : 'closed'} />
      <span dir="ltr" className="hidden truncate sm:inline">{room}</span>
      <span className="opacity-70">
        {players}/{capacity}
        {spectators > 0 ? ` · 👁${spectators}` : ''}
      </span>
    </span>
  );
}

function LanguageSelect({
  locale,
  disabled,
  onChange,
  labels,
}: {
  locale: GameLocale;
  disabled?: boolean;
  onChange: (locale: GameLocale) => void;
  labels: { label: string; arabic: string; english: string; hostOnly: string };
}) {
  return (
    <select
      value={locale}
      disabled={disabled}
      title={disabled ? labels.hostOnly : labels.label}
      aria-label={labels.label}
      onChange={(e) => onChange(e.target.value as GameLocale)}
      className="h-10 min-w-[4.5rem] cursor-pointer rounded-xl border border-edge bg-panel px-2 text-sm font-bold text-ink outline-none hover:bg-panel2 focus:border-accent disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:min-w-[5.5rem]"
    >
      <option value="ar">{labels.arabic}</option>
      <option value="en">{labels.english}</option>
    </select>
  );
}
