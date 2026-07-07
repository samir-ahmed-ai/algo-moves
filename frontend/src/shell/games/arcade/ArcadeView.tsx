import { useMemo, useState } from 'react';
import { useWorkspace } from '@/store/workspace';
import { getArcadeStrings, useGamesLocale } from '../locale';
import { useGameRoom } from '../net/useGameRoom';
import { RoomCommsProvider } from '../net/useRoomComms';
import { parseGamesHash } from '@/lib/navigation';
import { useSoundMuted } from '../ui/hooks';
import { Lobby } from '../lobby/Lobby';
import { RoomView } from '../room/RoomView';
import { ProgressOverlay } from '../post-match/ProgressOverlay';
import { ArcadeHeader } from './ArcadeHeader';

/** Live arcade shell: header chrome plus lobby or in-room views. */
export function ArcadeView() {
  const { theme, setTheme, goHome } = useWorkspace();
  const { locale, setLocale, canChangeLocale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { status, room, capacity, playerCount, spectatorCount, disconnect, reconnecting } =
    useGameRoom();
  const [prefillRoom] = useState(() =>
    typeof location === 'undefined'
      ? undefined
      : parseGamesHash(location.hash, location.pathname)?.room,
  );
  const [muted, toggleMuted] = useSoundMuted();
  const [showProgress, setShowProgress] = useState(false);

  const open = status === 'open';
  const live = open || reconnecting;

  return (
    <>
      <ArcadeHeader
        title={t.header.games}
        theme={theme}
        locale={locale}
        canChangeLocale={canChangeLocale}
        muted={muted}
        room={room}
        open={open}
        reconnecting={reconnecting}
        live={live}
        playerCount={playerCount}
        capacity={capacity}
        spectatorCount={spectatorCount}
        labels={{
          home: t.header.home,
          lightTheme: t.header.lightTheme,
          darkTheme: t.header.darkTheme,
          leaveRoom: t.header.leaveRoom,
          soundOn: t.room.soundOn,
          soundOff: t.room.soundOff,
          language: t.language,
        }}
        onHome={goHome}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onToggleMuted={toggleMuted}
        onLocaleChange={setLocale}
        onDisconnect={disconnect}
        onOpenProfile={() => setShowProgress(true)}
      />

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
