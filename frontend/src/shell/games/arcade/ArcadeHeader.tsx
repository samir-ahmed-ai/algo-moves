import type { ReactNode } from 'react';
import { Eye, Home, LogOut, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
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
    <header className="sticky top-0 z-20 border-b border-white/55 bg-white/74 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl [padding-top:env(safe-area-inset-top)] dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_14px_44px_rgba(0,0,0,0.24)]">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          title={labels.home}
          aria-label={labels.home}
          onClick={onHome}
          className="grid h-10 w-10 shrink-0 touch-manipulation place-items-center rounded-2xl border border-white/60 bg-white/70 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white sm:h-11 sm:w-11"
        >
          <Home className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1 select-none">
          <span className="block truncate text-[0.7rem] font-black uppercase tracking-[0.22em] text-cyan-600/80 dark:text-cyan-200/80">
            Arena
          </span>
          <span className="block truncate bg-gradient-to-r from-slate-950 via-cyan-700 to-slate-950 bg-clip-text text-lg font-black leading-none tracking-tight text-transparent dark:from-white dark:via-cyan-200 dark:to-white">
            {title}
          </span>
        </div>

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
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'grid h-10 w-10 touch-manipulation place-items-center rounded-2xl border border-white/60 bg-white/65 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white sm:h-11 sm:w-11',
        danger &&
          'hover:border-red-300/70 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-400/30 dark:hover:bg-red-500/10 dark:hover:text-red-200',
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
        'inline-flex min-w-0 max-w-[8rem] shrink items-center gap-1.5 rounded-2xl border px-2.5 py-1.5 font-mono text-xs font-black shadow-sm backdrop-blur sm:max-w-none',
        reconnecting
          ? 'border-amber-300/40 bg-amber-100/80 text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100'
          : filled
            ? 'border-emerald-300/45 bg-emerald-100/80 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100'
            : 'border-white/60 bg-white/65 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
      )}
    >
      <ConnectionDot status={open ? 'open' : reconnecting ? 'connecting' : 'closed'} />
      <span dir="ltr" className="hidden truncate sm:inline">
        {room}
      </span>
      <span className="inline-flex items-center gap-1 opacity-75">
        {players}/{capacity}
        {spectators > 0 ? (
          <>
            <span aria-hidden="true">·</span>
            <Eye className="h-3 w-3" aria-hidden="true" />
            {spectators}
          </>
        ) : null}
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
      className="h-10 min-w-[4.5rem] cursor-pointer rounded-2xl border border-white/60 bg-white/65 px-2 text-sm font-black text-slate-700 shadow-sm outline-none transition hover:bg-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/35 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:h-11 sm:min-w-[5.5rem]"
    >
      <option value="ar">{labels.arabic}</option>
      <option value="en">{labels.english}</option>
    </select>
  );
}
