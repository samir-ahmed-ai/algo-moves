import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Eye, Gamepad2, Loader2, Plus, Users } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { readStorageText, writeStorageText } from '../../../lib/storage';
import { getArcadeStrings, useGamesLocale } from '../locale';
import { useGameRoom } from '../net/useGameRoom';
import { useAuth } from '../data/AuthProvider';
import { fetchNewRoomCode, hasConfiguredServer, normalizeRoomCode } from '../net/gameServer';
import { writeGamesHash } from '../engine/gamesHash';
import { Avatar } from '../ui/Avatar';
import { TouchButton } from '../ui/gamesUi';

const NAME_KEY = 'algo-moves:games:name';
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

  const joinRoom = async (asSpectator = false) => {
    const code = normalizeRoomCode(joinCode);
    if (!nameOk || code.length < 4) return;
    await prepare();
    writeGamesHash({ room: code });
    connect(code, name.trim(), { asSpectator });
  };

  const connecting = status === 'connecting';
  const bannerError = createError ?? (error && (status === 'error' || status === 'full') ? error : null);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-white shadow-[var(--shadow-lg)]">
          <Gamepad2 className="h-7 w-7" />
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">{t.lobby.title}</h1>
        <p className="mt-1 text-sm text-ink2">{t.lobby.subtitle}</p>
      </div>

      {bannerError ? (
        <div className="flex items-start gap-2 rounded-[var(--radius)] border border-bad/40 bg-bad/10 p-3 text-sm text-bad">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{bannerError}</span>
        </div>
      ) : null}

      {!configuredServer ? (
        <p className="rounded-[var(--radius)] border border-edge bg-panel2 px-3 py-2 text-start text-xs text-ink3">
          {t.lobby.lanHint}
        </p>
      ) : null}

      <label className="flex flex-col gap-1.5 text-start">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink3">{t.lobby.yourName}</span>
        <div className="flex items-center gap-3">
          {name.trim() ? <Avatar seed={name.trim()} name={name.trim()} size={44} /> : null}
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            placeholder={t.lobby.namePlaceholder}
            className="min-h-12 flex-1 rounded-[var(--radius)] border border-edge bg-panel px-4 text-base text-ink outline-none focus:border-accent"
            autoComplete="given-name"
          />
        </div>
      </label>

      <div className="grid grid-cols-2 gap-1 rounded-[var(--radius)] border border-edge bg-panel2 p-1">
        <TabButton active={tab === 'create'} onClick={() => setTab('create')} icon={<Plus className="h-4 w-4" />}>
          {t.lobby.createTab}
        </TabButton>
        <TabButton active={tab === 'join'} onClick={() => setTab('join')} icon={<Users className="h-4 w-4" />}>
          {t.lobby.joinTab}
        </TabButton>
      </div>

      {tab === 'create' ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink3">{t.room.capacity}</span>
            <div className="grid grid-cols-4 gap-1 rounded-[var(--radius)] border border-edge bg-panel2 p-1">
              {CAPACITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCapacity(c)}
                  className={cn(
                    'min-h-10 rounded-[calc(var(--radius)-2px)] text-sm font-semibold transition-colors',
                    capacity === c ? 'bg-panel text-ink shadow-sm' : 'text-ink3 hover:text-ink',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <TouchButton variant="primary" size="lg" busy={connecting} disabled={!nameOk} onClick={createRoom}>
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
            className="min-h-14 rounded-[var(--radius)] border border-edge bg-panel text-center font-mono text-2xl font-bold uppercase tracking-[0.3em] text-ink outline-none focus:border-accent"
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
          className="mx-auto inline-flex min-h-11 items-center gap-1.5 px-4 text-sm text-ink3 hover:text-ink"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.lobby.cancel}
        </button>
      ) : null}
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
      className={
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-[calc(var(--radius)-2px)] text-sm font-semibold transition-colors ' +
        (active ? 'bg-panel text-ink shadow-sm' : 'text-ink3 hover:text-ink')
      }
    >
      {icon}
      {children}
    </button>
  );
}
