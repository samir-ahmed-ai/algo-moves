import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Copy, Eye, Loader2, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { buildGamesUrl, writeGamesHash } from '@/lib/navigation';
import { readStorageText, writeStorageText } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { getArcadeStrings, useGamesLocale } from '../locale';
import { useGameRoom } from '../net/useGameRoom';
import { useAuth } from '@/shell/auth/AuthProvider';
import { getPersonalRoomCode } from '@/platform';
import { fetchNewRoomCode, hasConfiguredServer, normalizeRoomCode } from '../net/gameServer';
import { Avatar } from '../ui/Avatar';
import { Glyph, TouchButton, CategoryBadge } from '../ui/gamesUi';
import { GAMES } from '../registry';
import { gameAccentColor } from '../gamePresentation';

const NAME_KEY = STORAGE_KEYS.GAMES_NAME;
const CAPACITIES = [2, 4, 6, 8];

/** Pre-connection screen: pick a name + avatar, then create or join a room. */
export function Lobby({ prefillRoom }: { prefillRoom?: string }) {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { connect, disconnect, status, error } = useGameRoom();
  const { ensureSignedIn, updateMyProfile, configured } = useAuth();
  const [name, setName] = useState(() => readStorageText(NAME_KEY, '') ?? '');
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
    writeStorageText(NAME_KEY, name.trim());
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
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      {/* Hero */}
      <HeroBanner />

      {/* Game preview strip */}
      <GamePreviewStrip />

      {bannerError ? (
        <div className="flex items-start gap-2 rounded-2xl border border-bad/40 bg-bad/10 p-3 text-sm text-bad">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{bannerError}</span>
        </div>
      ) : null}

      {!configuredServer ? (
        <p className="rounded-2xl border border-edge bg-panel2 px-3 py-2.5 text-start text-xs text-ink3">
          {t.lobby.lanHint}
        </p>
      ) : null}

      {/* Name input */}
      <label className="flex flex-col gap-2 text-start">
        <span className="text-xs font-bold uppercase tracking-widest text-ink3">
          {t.lobby.yourName}
        </span>
        <div className="flex items-center gap-3">
          {name.trim() ? (
            <div className="shrink-0">
              <Avatar seed={name.trim()} name={name.trim()} size={48} />
            </div>
          ) : (
            <div className="h-12 w-12 shrink-0 rounded-full bg-panel2 border-2 border-dashed border-edge2" />
          )}
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            placeholder={t.lobby.namePlaceholder}
            className="min-h-14 flex-1 rounded-2xl border-2 border-edge bg-panel px-4 text-lg font-semibold text-ink outline-none focus:border-accent transition-colors"
            autoComplete="given-name"
          />
        </div>
      </label>

      <div className="rounded-2xl border border-edge bg-panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-ink3">
              {t.lobby.yourRoom}
            </p>
            <p className="mt-1 font-mono text-3xl font-bold uppercase tracking-[0.35em] text-ink">
              {normalizeRoomCode(personalRoomCode)}
            </p>
            <p className="mt-2 text-xs text-ink3">{t.lobby.yourRoomHint}</p>
          </div>
          <button
            type="button"
            onClick={() => void copyPersonalCode()}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-edge bg-panel2 px-3 text-xs font-semibold text-ink3 hover:text-ink"
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
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-edge bg-panel2 p-1.5">
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-ink3">
              {t.room.capacity}
            </span>
            <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-edge bg-panel2 p-1.5">
              {CAPACITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCapacity(c)}
                  className={cn(
                    'min-h-11 rounded-xl text-sm font-bold transition-all touch-manipulation',
                    capacity === c ? 'bg-accent text-white shadow-sm' : 'text-ink3 hover:text-ink',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            {capacity === 2 && (
              <p className="text-xs text-accent font-medium text-center">💕 Perfect for two!</p>
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
        <div className="flex flex-col gap-3">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
            placeholder={t.lobby.roomCodePlaceholder}
            inputMode="text"
            autoCapitalize="characters"
            dir="ltr"
            className="min-h-[68px] rounded-2xl border-2 border-edge bg-panel text-center font-mono text-3xl font-bold uppercase tracking-[0.35em] text-ink outline-none focus:border-accent transition-colors"
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
          className="mx-auto inline-flex min-h-11 items-center gap-2 px-4 text-sm text-ink3 hover:text-ink"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.lobby.cancel}
        </button>
      ) : null}
    </div>
  );
}

function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent via-accent/80 to-purple-600 p-6 text-white shadow-[var(--shadow-lg)]">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative flex flex-col items-center gap-2 text-center">
        <div className="flex gap-3 text-6xl">
          <span className="animate-[bounce_1.2s_ease-in-out_infinite]">🎮</span>
          <span className="animate-[bounce_1.2s_ease-in-out_0.2s_infinite]">💕</span>
          <span className="animate-[bounce_1.2s_ease-in-out_0.4s_infinite]">🎲</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight drop-shadow-sm">Games Arcade</h1>
      </div>
    </div>
  );
}

function GamePreviewStrip() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-widest text-ink3 px-0.5">
        Games available
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
        {GAMES.map((game) => {
          const color = gameAccentColor(game);
          return (
            <div
              key={game.id}
              className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-edge bg-panel px-3 py-2.5 text-center"
              style={{ minWidth: 80 }}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: `${color}20`, color }}
              >
                <Glyph markup={game.glyph} className="h-5 w-5" />
              </span>
              <span
                className="text-[length:var(--fs-2xs)] font-bold text-ink leading-tight text-center"
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
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all touch-manipulation',
        active ? 'bg-panel text-ink shadow-sm' : 'text-ink3 hover:text-ink',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
