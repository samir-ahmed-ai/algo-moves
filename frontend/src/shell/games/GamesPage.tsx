import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Home, LogOut, Moon, Sun, Users, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useWorkspace } from '../../lib/workspace';
import { getMindMeldMeta } from './games/mind-meld';
import { GamesLocaleProvider, getArcadeStrings, useGamesLocale, type GameLocale } from './locale';
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
      <GamesLocaleProvider>
        <div
          data-density={density}
          className="ws-scroll flex h-full w-full flex-col overflow-y-auto bg-bg text-ink [padding-bottom:env(safe-area-inset-bottom)]"
        >
          <Arcade />
        </div>
      </GamesLocaleProvider>
    </GameRoomProvider>
  );
}

function localizedGameMeta(game: GameDef, locale: GameLocale): Pick<GameDef, 'title' | 'tagline'> {
  if (game.id === 'mind-meld') return getMindMeldMeta(locale);
  return { title: game.title, tagline: game.tagline };
}

function Arcade() {
  const { theme, setTheme, goHome } = useWorkspace();
  const { locale, setLocale, canChangeLocale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { status, room, peer, self, role, sharedState, publishState, disconnect, reconnecting } = useGameRoom();
  const [prefillRoom] = useState(() =>
    typeof location === 'undefined' ? undefined : parseGamesHash(location.hash)?.room,
  );
  const [partnerLeft, setPartnerLeft] = useState(false);

  const currentGame = getGame(selectedGameId(sharedState));
  const open = status === 'open';
  const isHost = role === 'host';
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
    publishState({ ...(sharedState as object | null), game: id, locale });
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
            title={t.header.home}
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
              <ArrowLeft className="h-4 w-4" /> {t.header.backToGames}
            </button>
          ) : currentGame && inGame ? (
            <span className="font-semibold tracking-tight">
              {localizedGameMeta(currentGame, locale).title}
            </span>
          ) : (
            <span className="font-semibold tracking-tight">{t.header.games}</span>
          )}

          <div className="ms-auto flex items-center gap-1.5">
            {room ? <RoomPill room={room} open={open} reconnecting={reconnecting} filled={bothHere} /> : null}
            <LanguageToggle
              locale={locale}
              disabled={!canChangeLocale}
              onChange={setLocale}
              switchToEnglish={t.language.switchToEnglish}
              switchToArabic={t.language.switchToArabic}
              hostOnly={t.language.hostOnly}
            />
            <button
              type="button"
              title={theme === 'dark' ? t.header.lightTheme : t.header.darkTheme}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="grid h-11 w-11 place-items-center rounded-md border border-edge text-ink3 hover:bg-panel2 hover:text-ink"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {live ? (
              <button
                type="button"
                title={t.header.leaveRoom}
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
            {t.header.reconnecting}
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
                <span className="font-semibold text-ink">{t.partnerLeftBanner.title}</span>
                <span>{isHost ? t.partnerLeftBanner.detailHost : t.partnerLeftBanner.detailGuest}</span>
              </div>
            ) : null}
            <GameFrame
              game={currentGame}
              locale={locale}
              selfName={self?.name}
              peerName={peer?.name}
              picker={t.picker}
            />
          </>
        ) : !bothHere ? (
          <WaitingRoom room={room ?? ''} partnerLeft={partnerLeft} locale={locale} />
        ) : (
          <GamePicker
            locale={locale}
            onPick={selectGame}
            selfName={self?.name}
            peerName={peer?.name}
            isHost={isHost}
          />
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
      <span dir="ltr">{room}</span>
      <span className="opacity-70">· {filled ? '2/2' : '1/2'}</span>
    </span>
  );
}

function WaitingRoom({
  room,
  partnerLeft,
  locale,
}: {
  room: string;
  partnerLeft?: boolean;
  locale: GameLocale;
}) {
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const serverHint = hasConfiguredServer()
    ? t.waitingRoom.serverHintDeployed
    : t.waitingRoom.serverHintLan;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 animate-pulse place-items-center rounded-full bg-accentbg text-accent">
          <Users className="h-6 w-6" />
        </span>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-ink">
          {partnerLeft ? t.waitingRoom.partnerLeftTitle : t.waitingRoom.waitingTitle}
        </h2>
        <p className="mt-1 text-sm text-ink2">
          {partnerLeft ? t.waitingRoom.partnerLeftDetail : t.waitingRoom.waitingDetail}
        </p>
      </div>
      <ShareRoom room={room} hint={serverHint} locale={locale} />
    </div>
  );
}

function LanguageToggle({
  locale,
  disabled,
  onChange,
  switchToEnglish,
  switchToArabic,
  hostOnly,
}: {
  locale: GameLocale;
  disabled?: boolean;
  onChange: (locale: GameLocale) => void;
  switchToEnglish: string;
  switchToArabic: string;
  hostOnly: string;
}) {
  const next = locale === 'ar' ? 'en' : 'ar';
  return (
    <button
      type="button"
      title={disabled ? hostOnly : locale === 'ar' ? switchToEnglish : switchToArabic}
      disabled={disabled}
      onClick={() => onChange(next)}
      className="grid h-11 min-w-11 place-items-center rounded-md border border-edge px-2 font-mono text-xs font-bold text-ink3 hover:bg-panel2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {locale === 'ar' ? 'EN' : 'عر'}
    </button>
  );
}

function GamePicker({
  locale,
  onPick,
  selfName,
  peerName,
  isHost,
}: {
  locale: GameLocale;
  onPick: (id: string) => void;
  selfName?: string;
  peerName?: string;
  isHost: boolean;
}) {
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const you = selfName ?? t.picker.you;
  const partner = peerName ?? t.picker.partner;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-5 flex items-center justify-center gap-2 text-sm text-ink2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-good/10 px-3 py-1 font-medium text-good">
          <span className="h-1.5 w-1.5 rounded-full bg-good" />
          {t.picker.playersIn(you, partner)}
        </span>
      </div>
      <h2 className="mb-1 text-center text-2xl font-bold tracking-tight text-ink">{t.picker.title}</h2>
      <p className="mb-6 text-center text-sm text-ink3">
        {isHost ? t.picker.hostHint : t.picker.guestHint}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {GAMES.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            meta={localizedGameMeta(game, locale)}
            paceLabel={game.pace === 'simultaneous' ? t.picker.paceTogether : t.picker.paceTurns}
            onClick={() => onPick(game.id)}
            disabled={!isHost}
          />
        ))}
      </div>
    </div>
  );
}

function GameCard({
  game,
  meta,
  paceLabel,
  onClick,
  disabled,
}: {
  game: GameDef;
  meta: Pick<GameDef, 'title' | 'tagline'>;
  paceLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex items-center gap-4 rounded-[var(--radius)] border border-edge bg-panel/60 p-4 text-start transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-accentbg text-accent">
        <Glyph markup={game.glyph} className="h-8 w-8" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{meta.title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-ink2">{meta.tagline}</span>
        <span className="mt-2 flex items-center gap-2 text-[11px] text-ink3">
          <span className="rounded-full bg-panel2 px-2 py-0.5 font-medium">{paceLabel}</span>
          <span>{game.minutes}</span>
        </span>
      </span>
    </button>
  );
}

function GameFrame({
  game,
  locale,
  selfName,
  peerName,
  picker,
}: {
  game: GameDef;
  locale: GameLocale;
  selfName?: string;
  peerName?: string;
  picker: ReturnType<typeof getArcadeStrings>['picker'];
}) {
  const Component = game.Component;
  const meta = localizedGameMeta(game, locale);
  const you = selfName ?? picker.you;
  const partner = peerName ?? picker.partner;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-4 text-center">
        <h2 className="text-lg font-bold tracking-tight text-ink">{meta.title}</h2>
        <p className="text-xs text-ink3">
          {you} {picker.vs} {partner}
        </p>
      </div>
      <Component />
    </div>
  );
}
