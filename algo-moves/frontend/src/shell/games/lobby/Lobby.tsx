import { useEffect, useState } from 'react';
import { AlertCircle, Gamepad2, Loader2, Plus, Users } from 'lucide-react';
import { readStorageText, writeStorageText } from '../../../lib/storage';
import { useGameRoom } from '../net/useGameRoom';
import { makeRoomCode, normalizeRoomCode } from '../net/gameServer';
import { writeGamesHash } from '../engine/gamesHash';
import { TouchButton } from '../ui/gamesUi';

const NAME_KEY = 'algo-moves:games:name';

/** Pre-connection screen: pick a display name, then create or join a room. */
export function Lobby({ prefillRoom }: { prefillRoom?: string }) {
  const { connect, disconnect, status, error } = useGameRoom();
  const [name, setName] = useState(() => readStorageText(NAME_KEY, '') ?? '');
  const [joinCode, setJoinCode] = useState(prefillRoom ?? '');
  const [tab, setTab] = useState<'create' | 'join'>(prefillRoom ? 'join' : 'create');
  const nameOk = name.trim().length > 0;

  useEffect(() => {
    if (prefillRoom) {
      setJoinCode(prefillRoom);
      setTab('join');
    }
  }, [prefillRoom]);

  const remember = () => writeStorageText(NAME_KEY, name.trim());

  const createRoom = () => {
    if (!nameOk) return;
    remember();
    const code = makeRoomCode();
    writeGamesHash({ room: code });
    connect(code, name.trim());
  };

  const joinRoom = () => {
    const code = normalizeRoomCode(joinCode);
    if (!nameOk || code.length < 4) return;
    remember();
    writeGamesHash({ room: code });
    connect(code, name.trim());
  };

  const connecting = status === 'connecting';

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-white shadow-[var(--shadow-lg)]">
          <Gamepad2 className="h-7 w-7" />
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">Two-player games</h1>
        <p className="mt-1 text-sm text-ink2">Create a room and share the code — play together from anywhere.</p>
      </div>

      {(error && (status === 'error' || status === 'full')) ? (
        <div className="flex items-start gap-2 rounded-[var(--radius)] border border-bad/40 bg-bad/10 p-3 text-sm text-bad">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink3">Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 24))}
          placeholder="e.g. Ahmed"
          className="min-h-12 rounded-[var(--radius)] border border-edge bg-panel px-4 text-base text-ink outline-none focus:border-accent"
          autoComplete="given-name"
        />
      </label>

      <div className="grid grid-cols-2 gap-1 rounded-[var(--radius)] border border-edge bg-panel2 p-1">
        <TabButton active={tab === 'create'} onClick={() => setTab('create')} icon={<Plus className="h-4 w-4" />}>
          Create
        </TabButton>
        <TabButton active={tab === 'join'} onClick={() => setTab('join')} icon={<Users className="h-4 w-4" />}>
          Join
        </TabButton>
      </div>

      {tab === 'create' ? (
        <TouchButton variant="primary" size="lg" busy={connecting} disabled={!nameOk} onClick={createRoom}>
          {connecting ? 'Creating room…' : 'Create a room'}
        </TouchButton>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
            placeholder="ROOM CODE"
            inputMode="text"
            autoCapitalize="characters"
            className="min-h-14 rounded-[var(--radius)] border border-edge bg-panel text-center font-mono text-2xl font-bold uppercase tracking-[0.3em] text-ink outline-none focus:border-accent"
          />
          <TouchButton
            variant="primary"
            size="lg"
            busy={connecting}
            disabled={!nameOk || normalizeRoomCode(joinCode).length < 4}
            onClick={joinRoom}
          >
            {connecting ? 'Joining…' : 'Join room'}
          </TouchButton>
        </div>
      )}

      {connecting ? (
        <button
          type="button"
          onClick={disconnect}
          className="mx-auto inline-flex items-center gap-1.5 text-xs text-ink3 hover:text-ink"
        >
          <Loader2 className="h-3 w-3 animate-spin" /> Cancel
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
