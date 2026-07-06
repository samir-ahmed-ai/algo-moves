import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Eye, Info, Play, Users } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { playCue } from '@/lib/utils/audio';
import { getArcadeStrings, useGamesLocale } from '../locale';
import { useGameRoom } from '../net/useGameRoom';
import { useRoomComms } from '../net/useRoomComms';
import { getGame, GAMES } from '../registry';
import { gameCapacity, type GameDef } from '../types';
import { localizedGameMeta } from '../gameMeta';
import { hasConfiguredServer } from '../net/gameServer';
import { Glyph, TouchButton } from '../ui/gamesUi';
import { CountdownRing } from '../ui/effects';
import { Avatar } from '../ui/Avatar';
import { ShareRoom } from '../lobby/ShareRoom';
import { Roster } from './Roster';
import { ChatDock } from './ChatDock';
import type { RoomMode } from '../data/types';

interface RoomState {
  game?: string | null;
  mode?: RoomMode;
  locale?: string;
  started?: boolean;
}

const GAME_ACCENT_COLORS: Record<string, string> = {
  'would-you-rather': '#e879a0',
  'number-duel': '#6366f1',
  'tic-tac-toe': '#0ea5e9',
  'rock-paper-scissors': '#f59e0b',
  'mind-meld': '#8b5cf6',
  'reaction-duel': '#10b981',
};

const GAME_EMOJI: Record<string, string> = {
  'would-you-rather': '💕',
  'number-duel': '🔢',
  'tic-tac-toe': '⭕',
  'rock-paper-scissors': '✊',
  'mind-meld': '🧠',
  'reaction-duel': '⚡',
};

const HOW_TO_PLAY: Record<string, string> = {
  'would-you-rather': 'Both choose between two options simultaneously. Match = +2 pts each. Differ = +1 each. 8 rounds.',
  'number-duel': 'Each player hides a secret number 1–100. Race to guess your opponent\'s in fewest tries. Roles swap each round.',
  'tic-tac-toe': 'Classic 3×3 grid. Get three in a row to win. 15 s turn timer — miss it and a move is auto-played.',
  'rock-paper-scissors': 'Lock in your throw, then reveal together. Best of 5 wins. Throw in taunts during the countdown!',
  'mind-meld': 'Both pick from this-or-that prompts simultaneously. Score goes up for every matching answer. 12 s per round.',
  'reaction-duel': 'Wait for the screen to go green, then tap as fast as you can. False start = penalty. First to target wins.',
};

type FilterTab = 'all' | 'couple' | 'party';

/** The full in-room experience: choose → ready up → countdown → play. */
export function RoomView() {
  const { sharedState, role } = useGameRoom();
  const ss = (sharedState ?? {}) as RoomState;
  const currentGame = getGame(ss.game);
  const started = ss.started === true && !!currentGame;

  if (!currentGame) return <Staging>{role === 'host' ? <GameChooser /> : <WaitingForHost />}</Staging>;
  if (!started) return <Staging game={currentGame}><ReadyRoom game={currentGame} /></Staging>;
  return <PlayArea game={currentGame} />;
}

/** Shared staging shell: roster on top, the inner step, then invite + chat. */
function Staging({ game, children }: { game?: GameDef; children: React.ReactNode }) {
  const { locale } = useGamesLocale();
  const { room } = useGameRoom();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const serverHint = hasConfiguredServer() ? t.waitingRoom.serverHintDeployed : t.waitingRoom.serverHintLan;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <Roster />
      <div className="rounded-2xl border border-edge bg-panel/60 p-4">{children}</div>
      {!game ? <ShareRoom room={room ?? ''} hint={serverHint} locale={locale} /> : null}
      <ChatDock />
    </div>
  );
}

function WaitingForHost() {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="grid h-12 w-12 animate-pulse place-items-center rounded-full bg-accentbg text-accent">
        <Users className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium text-ink2">{t.picker.guestHint}</p>
    </div>
  );
}

function GameChooser() {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { publishState, sharedState, capacity, playerCount } = useGameRoom();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [infoGame, setInfoGame] = useState<string | null>(null);

  const choose = (game: GameDef) => {
    playCue('select');
    publishState({
      ...(sharedState as object | null),
      game: game.id,
      mode: capacity > 2 ? 'ffa' : 'duel',
      locale,
      started: false,
    });
  };

  const filteredGames = GAMES.filter((game) => {
    if (filter === 'all') return true;
    if (filter === 'couple') return game.category === 'couple';
    return game.category === 'party';
  });

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-extrabold tracking-tight text-ink">{t.room.chooseGame}</h2>
      <p className="mb-4 text-center text-sm text-ink3">{t.room.playersHere(playerCount, capacity)}</p>

      {/* Category filter pills */}
      <div className="mb-4 flex items-center justify-center gap-2">
        {(['all', 'couple', 'party'] as FilterTab[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-bold transition-all touch-manipulation',
              filter === f
                ? 'bg-accent text-white shadow-sm'
                : 'bg-panel2 text-ink3 hover:text-ink border border-edge',
            )}
          >
            {f === 'all' ? 'All' : f === 'couple' ? '💕 For Two' : '🎉 Party'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {filteredGames.map((game) => {
          const cap = gameCapacity(game);
          const fits = playerCount >= cap.min && playerCount <= cap.max;
          const meta = localizedGameMeta(game, locale);
          const color = GAME_ACCENT_COLORS[game.id] ?? 'var(--accent)';
          const isCouple = game.category === 'couple';
          const showInfo = infoGame === game.id;

          return (
            <div key={game.id} className="flex flex-col">
              <button
                type="button"
                disabled={!fits}
                onClick={() => choose(game)}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl border-2 bg-panel/70 p-3.5 text-start transition-all touch-manipulation',
                  fits
                    ? 'hover:-translate-y-0.5 hover:bg-panel hover:shadow-[var(--shadow-md)] active:scale-[0.99]'
                    : 'cursor-not-allowed opacity-50',
                )}
                style={fits ? { borderColor: `${color}40` } : { borderColor: 'var(--edge)' }}
              >
                {/* Left color bar */}
                <div
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{ background: fits ? color : 'var(--edge2)' }}
                />

                {/* Icon */}
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                  style={{ background: `${color}20`, color }}
                >
                  <Glyph markup={game.glyph} className="h-7 w-7" />
                </span>

                {/* Text */}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-ink truncate">{meta.title}</span>
                    {isCouple && (
                      <span className="shrink-0 rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-bold text-pink-500">
                        ♥ For Two
                      </span>
                    )}
                    {!fits && (
                      <span className="shrink-0 rounded-full bg-panel2 px-2 py-0.5 text-[10px] font-semibold text-ink3 border border-edge">
                        {cap.min}–{cap.max}P
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink3 leading-snug">
                    {fits ? meta.tagline : `Needs ${cap.min}–${cap.max} players`}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink3">
                    <span>{game.minutes}</span>
                    <span className="text-edge2">·</span>
                    <span>{game.pace === 'turns' ? '🔄 Turns' : '⚡ Together'}</span>
                  </span>
                </span>

                {/* Info button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInfoGame(showInfo ? null : game.id);
                  }}
                  className="shrink-0 grid h-8 w-8 place-items-center rounded-full text-ink3 hover:bg-panel2 hover:text-ink transition-colors"
                >
                  <Info className="h-4 w-4" />
                </button>
              </button>

              {/* Inline how-to-play */}
              {showInfo && (
                <div
                  className="mx-2 -mt-1 rounded-b-2xl border border-t-0 bg-panel2 px-4 py-3 text-xs text-ink2 leading-relaxed"
                  style={{ borderColor: `${color}30` }}
                >
                  <span className="font-bold text-ink">{GAME_EMOJI[game.id]} How to play: </span>
                  {HOW_TO_PLAY[game.id] ?? 'Two players, one winner. Good luck!'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReadyRoom({ game }: { game: GameDef }) {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { players, playerCount, role, isSpectator, sharedState, publishState, capacity } = useGameRoom();
  const { ready, setReady, readyIds } = useRoomComms();
  const meta = localizedGameMeta(game, locale);
  const cap = gameCapacity(game);
  const isHost = role === 'host';
  const color = GAME_ACCENT_COLORS[game.id] ?? 'var(--accent)';

  const cleared = useRef(false);
  useEffect(() => {
    if (!cleared.current) {
      setReady(false);
      cleared.current = true;
    }
  }, [setReady]);

  const enoughPlayers = playerCount >= cap.min;
  const allReady = players.length > 0 && players.every((p) => readyIds.has(p.id));
  const canStart = isHost && enoughPlayers && allReady;

  const start = () => {
    playCue('countdown');
    publishState({ ...(sharedState as object | null), started: true });
  };
  const changeGame = () => {
    playCue('click');
    publishState({ ...(sharedState as object | null), game: null, started: false });
  };

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span
        className="grid h-16 w-16 place-items-center rounded-3xl shadow-lg"
        style={{ background: `${color}20`, color }}
      >
        <Glyph markup={game.glyph} className="h-9 w-9" />
      </span>
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-ink">{meta.title}</h2>
        <p className="text-xs text-ink3 mt-1">{meta.tagline}</p>
      </div>

      {isSpectator ? (
        <SpectatorControls />
      ) : (
        <TouchButton
          variant={ready ? 'good' : 'accentSoft'}
          size="lg"
          onClick={() => {
            playCue('click');
            setReady(!ready);
          }}
          className="w-full max-w-xs"
        >
          {ready ? t.room.ready + ' ✓' : t.room.readyUp}
        </TouchButton>
      )}

      {!enoughPlayers ? (
        <p className="text-sm text-ink3">{t.room.needMorePlayers(cap.min - playerCount)}</p>
      ) : allReady ? (
        <p className="text-sm font-semibold text-good">{t.room.everyoneReady}</p>
      ) : (
        <p className="text-sm text-ink3">{t.room.waitingForPlayers}</p>
      )}

      {isHost ? (
        <div className="flex w-full max-w-xs flex-col gap-2">
          <TouchButton variant="primary" size="lg" disabled={!canStart} onClick={start} icon={<Play className="h-4 w-4" />} className="w-full">
            {t.room.start}
          </TouchButton>
          <button type="button" onClick={changeGame} className="inline-flex min-h-10 items-center justify-center gap-1.5 text-xs text-ink3 hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" /> {t.room.changeGame}
          </button>
        </div>
      ) : null}

      <SessionStandings />

      <p className="text-[11px] text-ink3">{t.room.playersHere(playerCount, capacity)}</p>
    </div>
  );
}

/** Running win tally across the room's matches this session. */
function SessionStandings() {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { players } = useGameRoom();
  const { standings } = useRoomComms();
  const total = Object.values(standings).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const ranked = [...players]
    .map((p) => ({ p, wins: standings[p.id] ?? 0 }))
    .sort((a, b) => b.wins - a.wins);

  const topWins = ranked[0]?.wins ?? 0;

  return (
    <div className="w-full rounded-2xl border border-edge bg-panel/50 p-3 text-start">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink3">{t.room.standings}</p>
      <ul className="flex flex-col gap-2">
        {ranked.map(({ p, wins }, i) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <span className="w-5 text-center text-sm">
              {wins > 0 && wins === topWins && i === 0 ? '👑' : <span className="text-xs font-bold text-ink3">{i + 1}</span>}
            </span>
            <Avatar seed={p.id} name={p.name} size={22} />
            <span className="min-w-0 flex-1 truncate font-medium text-ink">{p.name}</span>
            <span className="font-bold tabular-nums text-accent">{wins}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpectatorControls() {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { playerCount, capacity, requestSeat } = useGameRoom();
  const seatFree = playerCount < capacity;
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-panel2 px-3 py-1 text-sm text-ink2">
        <Eye className="h-4 w-4" /> {t.room.spectating}
      </span>
      {seatFree ? (
        <TouchButton variant="accentSoft" size="md" onClick={() => requestSeat('player')}>
          {t.room.joinAsPlayer}
        </TouchButton>
      ) : (
        <span className="text-xs text-ink3">{t.room.seatsFull}</span>
      )}
    </div>
  );
}

function PlayArea({ game }: { game: GameDef }) {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { role, sharedState, publishState } = useGameRoom();
  const meta = localizedGameMeta(game, locale);
  const Component = game.Component;
  const isHost = role === 'host';
  const [counting, setCounting] = useState(true);

  const changeGame = () => {
    playCue('click');
    publishState({ ...(sharedState as object | null), game: null, started: false });
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Roster compact />
        {isHost ? (
          <button
            type="button"
            onClick={changeGame}
            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl border border-edge px-3 py-1 text-xs text-ink3 hover:text-ink touch-manipulation"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t.room.changeGame}
          </button>
        ) : null}
      </div>

      <div className="relative rounded-2xl border border-edge bg-panel/40 p-4 min-h-[58dvh] sm:min-h-0 overflow-y-auto">
        {counting ? (
          <StartCountdown
            title={meta.title}
            emoji={GAME_EMOJI[game.id] ?? '🎮'}
            onDone={() => setCounting(false)}
          />
        ) : (
          <Component />
        )}
      </div>

      <ChatDock />
    </div>
  );
}

/** A brief synchronized 3-2-1 before the game surface mounts. */
function StartCountdown({ title, emoji, onDone }: { title: string; emoji: string; onDone: () => void }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n <= 0) {
      playCue('go');
      const t = setTimeout(onDone, 300);
      return () => clearTimeout(t);
    }
    playCue('countdown');
    const t = setTimeout(() => setN((v) => v - 1), 700);
    return () => clearTimeout(t);
  }, [n, onDone]);

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <span
        key={n}
        className="text-5xl"
        style={{ animation: 'countdownPop 0.6s ease-out both' }}
      >
        {n > 0 ? emoji : '🚀'}
      </span>
      <CountdownRing progress={n / 3} size={80} tone="accent" label={n > 0 ? String(n) : '·'} />
      <p className="text-sm font-semibold text-ink2">{title}</p>
      <style>{`
        @keyframes countdownPop {
          from { opacity: 0; transform: scale(1.6); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
