import { Home, LogOut, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { AuthButton } from '@/shell/auth';
import { ConnectionDot } from '../ui/effects';
import type { GameLocale } from '../locale';

export function ArcadeHeader({
  title,
  theme,
  locale,
  canChangeLocale,
  muted,
  room,
  open,
  reconnecting,
  live,
  playerCount,
  capacity,
  spectatorCount,
  labels,
  onHome,
  onToggleTheme,
  onToggleMuted,
  onLocaleChange,
  onDisconnect,
  onOpenProfile,
}: {
  title: string;
  theme: 'light' | 'dark';
  locale: GameLocale;
  canChangeLocale: boolean;
  muted: boolean;
  room: string | null;
  open: boolean;
  reconnecting: boolean;
  live: boolean;
  playerCount: number;
  capacity: number;
  spectatorCount: number;
  labels: {
    home: string;
    lightTheme: string;
    darkTheme: string;
    leaveRoom: string;
    soundOn: string;
    soundOff: string;
    language: { label: string; arabic: string; english: string; hostOnly: string };
  };
  onHome: () => void;
  onToggleTheme: () => void;
  onToggleMuted: () => void;
  onLocaleChange: (locale: GameLocale) => void;
  onDisconnect: () => void;
  onOpenProfile: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-edge bg-bg/90 backdrop-blur-md [padding-top:env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          title={labels.home}
          onClick={onHome}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-edge text-ink3 hover:bg-panel2 hover:text-ink touch-manipulation sm:h-11 sm:w-11"
        >
          <Home className="h-4 w-4" />
        </button>

        <span className="min-w-0 flex-1 truncate font-extrabold tracking-tight bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent select-none">
          {title}
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

          <IconButton title={muted ? labels.soundOff : labels.soundOn} onClick={onToggleMuted}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </IconButton>

          <LanguageSelect
            locale={locale}
            disabled={!canChangeLocale}
            onChange={onLocaleChange}
            labels={labels.language}
          />

          <IconButton
            title={theme === 'dark' ? labels.lightTheme : labels.darkTheme}
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </IconButton>

          {live ? (
            <IconButton title={labels.leaveRoom} onClick={onDisconnect} danger>
              <LogOut className="h-4 w-4" />
            </IconButton>
          ) : null}

          <AuthButton compact onOpenProfile={onOpenProfile} />
        </div>
      </div>
    </header>
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
      <span dir="ltr" className="hidden truncate sm:inline">
        {room}
      </span>
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
