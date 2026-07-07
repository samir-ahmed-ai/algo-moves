import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, Copy, Eye, Loader2, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { buildGamesUrl, writeGamesHash } from '@/lib/navigation';
import { readLobbyPlayerName, writeLobbyPlayerName } from '@/store/games/lobbyPrefs';
import { getArcadeStrings, useGamesLocale } from '../locale';
import { useGameRoom } from '../net/useGameRoom';
import { useAuth } from '@/shell/auth/AuthProvider';
import { getPersonalRoomCode } from '@/platform';
import { fetchNewRoomCode, hasConfiguredServer, normalizeRoomCode } from '../net/gameServer';
import { Avatar } from '../ui/Avatar';
import { Glyph, TouchButton, CategoryBadge } from '../ui/gamesUi';
import { GAMES } from '../registry';
import { gameAccentColor } from '../gamePresentation';

const CAPACITIES = [2, 4, 6, 8];

/** Pre-connection screen: pick a name + avatar, then create or join a room. */
export function Lobby({ prefillRoom }: { prefillRoom?: string | undefined }) {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { connect, disconnect, status, error } = useGameRoom();
  const { ensureSignedIn, updateMyProfile, configured } = useAuth();
  const [name, setName] = useState(() => readLobbyPlayerName());
  const [joinCode, setJoinCode] = useState(prefillRoom ?? '');
  const [tab, setTab] = useState<'create' | 'join'>(prefillRoom ? 'join' : 'create');
  const [capacity, setCapacity] = useState(2);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const personalRoomCode = useMemo(() => getPersonalRoomCode(), []);
  const nameOk = name.trim().length > 0;
  const configuredServer = hasConfiguredServer();

  useEffect(() => {
    if (prefillRoom) {
      setJoinCode(prefillRoom);
      setTab('join');
    }
  }, [prefillRoom]);

  const prepare = async () => {
    writeLobbyPlayerName(name.trim());
    if (configured) {
      await ensureSignedIn();
      await updateMyProfile({ display_name: name.trim() });
    }
  };

  const createRoom = async () => {
    if (!nameOk) return;
    setCreateError(null);
    try {
      await prepare();
      const code = await fetchNewRoomCode();
      writeGamesHash({ room: code });
      connect(code, name.trim(), { capacity });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t.lobby.createRoomError);
    }
  };

  const hostPersonalRoom = async () => {
    if (!nameOk) return;
    setCreateError(null);
    try {
      await prepare();
      const code = normalizeRoomCode(personalRoomCode);
      writeGamesHash({ room: code });
      connect(code, name.trim(), { capacity });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t.lobby.createRoomError);
    }
  };

  const copyPersonalCode = async () => {
    const code = normalizeRoomCode(personalRoomCode);
    try {
      await navigator.clipboard.writeText(buildGamesUrl(code));
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(code);
        setCopiedCode(true);
        window.setTimeout(() => setCopiedCode(false), 2000);
      } catch {
        // ignore clipboard failures
      }
    }
  };

  const joinRoom = async (asSpectator = false) => {
    const code = normalizeRoomCode(joinCode);
    if (!nameOk || code.length < 4) return;
    await prepare();
    writeGamesHash({ room: code });
    connect(code, name.trim(), { asSpectator });
  };

  const connecting = status === 'connecting';
  const bannerError =
    createError ?? (error && (status === 'error' || status === 'full') ? error : null);

  return (
    <div className="game-lobby-shell mx-auto flex w-full max-w-xl flex-col gap-6 p-4 sm:p-5">
      {/* Hero */}
      <HeroBanner />

      {/* Game preview strip */}
      <GamePreviewStrip />

      {bannerError ? (
        <div className="game-lobby-alert flex items-start gap-2 rounded-2xl border border-red-300/45 bg-red-50/85 p-3 text-sm font-semibold text-red-700 shadow-sm dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{bannerError}</span>
        </div>
      ) : null}

      {!configuredServer ? (
        <p className="game-lobby-note rounded-2xl border border-cyan-300/30 bg-cyan-50/80 px-3 py-2.5 text-start text-xs font-medium text-cyan-900 shadow-sm dark:border-cyan-300/15 dark:bg-cyan-300/10 dark:text-cyan-100">
          {t.lobby.lanHint}
        </p>
      ) : null}

      {/* Name input */}
      <label className="game-lobby-field flex flex-col gap-2 text-start">
        <span className="text-xs font-bold uppercase tracking-widest text-ink3">
          {t.lobby.yourName}
        </span>
        <div className="flex items-center gap-3">
          {name.trim() ? (
            <div className="shrink-0">
              <Avatar seed={name.trim()} name={name.trim()} size={48} />
            </div>
          ) : (
            <div className="h-12 w-12 shrink-0 rounded-full border-2 border-dashed border-slate-300 bg-white/70 shadow-inner dark:border-white/15 dark:bg-white/5" />
          )}
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            placeholder={t.lobby.namePlaceholder}
            className="game-lobby-input min-h-14 flex-1 rounded-2xl border border-white/60 bg-white/80 px-4 text-lg font-bold text-slate-900 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
            autoComplete="given-name"
          />
        </div>
      </label>

      <div className="game-lobby-room-card rounded-3xl border border-white/60 bg-white/76 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.1)] backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-ink3">
              {t.lobby.yourRoom}
            </p>
            <p className="mt-1 font-mono text-3xl font-black uppercase tracking-[0.35em] text-slate-950 dark:text-white">
              {normalizeRoomCode(personalRoomCode)}
            </p>
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.lobby.yourRoomHint}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copyPersonalCode()}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-2xl border border-white/60 bg-white/80 px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Copy className="h-3.5 w-3.5" />
            {copiedCode ? t.lobby.codeCopied : t.lobby.copyCode}
          </button>
        </div>
        <TouchButton
          variant="primary"
          size="lg"
          className="mt-4"
          busy={connecting}
          disabled={!nameOk}
          onClick={hostPersonalRoom}
        >
          {connecting ? t.lobby.creatingRoom : t.lobby.hostMyRoom}
        </TouchButton>
      </div>

      {/* Create / Join tabs */}
      <div className="game-lobby-tabs grid grid-cols-2 gap-1.5 rounded-2xl border border-white/60 bg-slate-950/5 p-1.5 shadow-inner dark:border-white/10 dark:bg-white/5">
        <TabButton
          active={tab === 'create'}
          onClick={() => setTab('create')}
          icon={<Plus className="h-4 w-4" />}
        >
          {t.lobby.createTab}
        </TabButton>
        <TabButton
          active={tab === 'join'}
          onClick={() => setTab('join')}
          icon={<Users className="h-4 w-4" />}
        >
          {t.lobby.joinTab}
        </TabButton>
      </div>

      {tab === 'create' ? (
        <div className="game-lobby-action-card flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-ink3">
              {t.room.capacity}
            </span>
            <div className="game-lobby-capacity-grid grid grid-cols-4 gap-1.5 rounded-2xl border border-white/60 bg-slate-950/5 p-1.5 shadow-inner dark:border-white/10 dark:bg-white/5">
              {CAPACITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCapacity(c)}
                  className={cn(
                    'min-h-11 rounded-xl text-sm font-bold transition-all touch-manipulation',
                    capacity === c
                      ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                      : 'text-slate-500 hover:bg-white/70 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            {capacity === 2 && (
              <p className="text-center text-xs font-bold text-cyan-700 dark:text-cyan-200">
                Perfect for two
              </p>
            )}
          </div>
          <TouchButton
            variant="primary"
            size="lg"
            busy={connecting}
            disabled={!nameOk}
            onClick={createRoom}
          >
            {connecting ? t.lobby.creatingRoom : t.lobby.createRoom}
          </TouchButton>
        </div>
      ) : (
        <div className="game-lobby-action-card flex flex-col gap-3">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
            placeholder={t.lobby.roomCodePlaceholder}
            inputMode="text"
            autoCapitalize="characters"
            dir="ltr"
            className="game-lobby-code-input min-h-[68px] rounded-2xl border border-white/60 bg-white/80 text-center font-mono text-3xl font-black uppercase tracking-[0.35em] text-slate-950 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <TouchButton
            variant="primary"
            size="lg"
            busy={connecting}
            disabled={!nameOk || normalizeRoomCode(joinCode).length < 4}
            onClick={() => joinRoom(false)}
          >
            {connecting ? t.lobby.joining : t.lobby.joinRoom}
          </TouchButton>
          <TouchButton
            variant="ghost"
            size="md"
            icon={<Eye className="h-4 w-4" />}
            disabled={!nameOk || normalizeRoomCode(joinCode).length < 4}
            onClick={() => joinRoom(true)}
          >
            {t.room.watchInstead}
          </TouchButton>
        </div>
      )}

      {connecting ? (
        <button
          type="button"
          onClick={disconnect}
          className="mx-auto inline-flex min-h-11 items-center gap-2 px-4 text-sm font-bold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.lobby.cancel}
        </button>
      ) : null}
    </div>
  );
}

function HeroBanner() {
  return (
    <div className="game-lobby-hero relative overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950 p-6 text-white shadow-[0_22px_80px_rgba(8,47,73,0.24)]">
      <div className="game-lobby-hero__grid" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <div className="game-lobby-hero__glyphs">
          {GAMES.slice(0, 3).map((game) => (
            <span key={game.id} style={{ color: gameAccentColor(game) }}>
              <Glyph markup={game.glyph} className="h-7 w-7" />
            </span>
          ))}
        </div>
        <span className="game-lobby-hero__eyebrow">Multiplayer lab</span>
        <h1 className="text-2xl font-black tracking-tight drop-shadow-sm">Games Arcade</h1>
        <p className="max-w-sm text-sm font-medium leading-6 text-white/72">
          Fast rooms, shared codes, and party games built for the same screen or a LAN.
        </p>
      </div>
    </div>
  );
}

function GamePreviewStrip() {
  return (
    <div className="game-preview-strip flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-widest text-ink3 px-0.5">
        Games available
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
        {GAMES.map((game) => {
          const color = gameAccentColor(game);
          return (
            <div
              key={game.id}
              className="game-preview-card flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-white/60 bg-white/76 px-3 py-2.5 text-center shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5"
              style={{ minWidth: 80 }}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-2xl"
                style={{ background: `${color}20`, color }}
              >
                <Glyph markup={game.glyph} className="h-5 w-5" />
              </span>
              <span
                className="text-center text-[length:var(--fs-2xs)] font-bold leading-tight text-slate-800 dark:text-slate-100"
                style={{ maxWidth: 68 }}
              >
                {game.title.length > 12 ? game.title.slice(0, 11) + '…' : game.title}
              </span>
              {game.category ? <CategoryBadge category={game.category} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl text-sm font-black transition-all',
        active
          ? 'bg-white text-slate-950 shadow-sm dark:bg-white dark:text-slate-950'
          : 'text-slate-500 hover:bg-white/70 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
