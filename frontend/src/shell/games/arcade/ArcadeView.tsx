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

      <main
        aria-label={t.header.games}
        className="relative isolate mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4"
      >
        <div className="pointer-events-none absolute inset-x-6 top-1 h-24 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-300/15" />

        {reconnecting ? (
          <div
            className="relative z-10 mb-4 flex items-center justify-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-100/80 px-3 py-2.5 text-sm font-semibold text-amber-950 shadow-lg shadow-amber-950/5 backdrop-blur dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100"
            role="status"
          >
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.75)]" />
            {t.header.reconnecting}
          </div>
        ) : null}

        <section className="relative z-10 min-h-0 flex-1 overflow-y-auto rounded-[2rem] border border-white/60 bg-white/72 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[0_24px_90px_rgba(0,0,0,0.36)]">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
          {!live ? (
            <Lobby prefillRoom={prefillRoom} />
          ) : (
            <RoomCommsProvider>
              <RoomView />
            </RoomCommsProvider>
          )}
        </section>
      </main>

      {showProgress ? <ProgressOverlay onClose={() => setShowProgress(false)} /> : null}
    </>
  );
}
