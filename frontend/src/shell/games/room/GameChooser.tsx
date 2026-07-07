import { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { playCue } from '@/lib/utils/audio';
import { useArcadeStrings, useGamesLocale } from '../locale';
import { useGameRoom } from '../net/useGameRoom';
import { GAMES } from '../registry';
import { gameCapacity, type GameDef } from '../types';
import { localizedGameMeta } from '../gameMeta';
import { gameAccentColor, gameEmoji, gameHowToPlay } from '../gamePresentation';
import { CategoryBadge, Glyph } from '../ui/gamesUi';
import { patchRoomState } from './roomState';

type FilterTab = 'all' | 'couple' | 'party';

const FILTER_TABS: FilterTab[] = ['all', 'couple', 'party'];

const FILTER_LABEL_KEY: Record<FilterTab, 'filterAll' | 'filterCouple' | 'filterParty'> = {
  all: 'filterAll',
  couple: 'filterCouple',
  party: 'filterParty',
};

export function GameChooser() {
  const { locale } = useGamesLocale();
  const t = useArcadeStrings();
  const { publishState, sharedState, capacity, playerCount } = useGameRoom();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [infoGame, setInfoGame] = useState<string | null>(null);

  const choose = (game: GameDef) => {
    playCue('select');
    publishState(
      patchRoomState(sharedState, {
        game: game.id,
        mode: capacity > 2 ? 'ffa' : 'duel',
        locale,
        started: false,
      }),
    );
  };

  const filteredGames = GAMES.filter((game) => filter === 'all' || game.category === filter);

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-extrabold tracking-tight text-ink">{t.room.chooseGame}</h2>
      <p className="mb-4 text-center text-sm text-ink3">{t.room.playersHere(playerCount, capacity)}</p>

      <div className="mb-4 flex items-center justify-center gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-bold transition-all touch-manipulation',
              filter === tab
                ? 'bg-accent text-white shadow-sm'
                : 'bg-panel2 text-ink3 hover:text-ink border border-edge',
            )}
          >
            {t.picker[FILTER_LABEL_KEY[tab]]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {filteredGames.map((game) => (
          <GameChooserCard
            key={game.id}
            game={game}
            locale={locale}
            playerCount={playerCount}
            expanded={infoGame === game.id}
            onToggleInfo={() => setInfoGame((current) => (current === game.id ? null : game.id))}
            onChoose={() => choose(game)}
          />
        ))}
      </div>
    </div>
  );
}

function GameChooserCard({
  game,
  locale,
  playerCount,
  expanded,
  onToggleInfo,
  onChoose,
}: {
  game: GameDef;
  locale: Parameters<typeof localizedGameMeta>[1];
  playerCount: number;
  expanded: boolean;
  onToggleInfo: () => void;
  onChoose: () => void;
}) {
  const t = useArcadeStrings();
  const cap = gameCapacity(game);
  const fits = playerCount >= cap.min && playerCount <= cap.max;
  const meta = localizedGameMeta(game, locale);
  const color = gameAccentColor(game);
  const paceLabel = game.pace === 'turns' ? `🔄 ${t.picker.paceTurns}` : `⚡ ${t.picker.paceTogether}`;

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'group relative flex items-stretch rounded-2xl border-2 bg-panel/70 p-3.5 transition-all',
          fits ? 'hover:-translate-y-0.5 hover:bg-panel hover:shadow-[var(--shadow-md)]' : 'opacity-50',
        )}
        style={fits ? { borderColor: `${color}40` } : { borderColor: 'var(--edge)' }}
      >
        <button
          type="button"
          disabled={!fits}
          onClick={onChoose}
          className={cn(
            'flex min-w-0 flex-1 items-stretch gap-3 text-start touch-manipulation',
            fits ? 'active:scale-[0.99]' : 'cursor-not-allowed',
          )}
        >
          <span
            className="w-1 shrink-0 rounded-full"
            style={{ background: fits ? color : 'var(--edge2)' }}
          />
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
            style={{ background: `${color}20`, color }}
          >
            <Glyph markup={game.glyph} className="h-7 w-7" />
          </span>
          <span className="min-w-0 flex-1 pe-10">
            <span className="flex items-center gap-2">
              <span className="font-bold text-ink truncate">{meta.title}</span>
              {game.category ? <CategoryBadge category={game.category} /> : null}
              {!fits ? (
                <span className="shrink-0 rounded-full bg-panel2 px-2 py-0.5 text-[10px] font-semibold text-ink3 border border-edge">
                  {t.picker.playerRange(cap.min, cap.max)}
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 block text-xs text-ink3 leading-snug">
              {fits ? meta.tagline : t.picker.needsPlayers(cap.min, cap.max)}
            </span>
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink3">
              <span>{game.minutes}</span>
              <span className="text-edge2">·</span>
              <span>{paceLabel}</span>
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleInfo}
          aria-expanded={expanded}
          aria-label={expanded ? t.picker.hideHowToPlay : t.picker.showHowToPlay}
          className="absolute end-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink3 hover:bg-panel2 hover:text-ink transition-colors touch-manipulation"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {expanded ? (
        <div
          className="mx-2 -mt-1 rounded-b-2xl border border-t-0 bg-panel2 px-4 py-3 text-xs text-ink2 leading-relaxed"
          style={{ borderColor: `${color}30` }}
        >
          <span className="font-bold text-ink">
            {gameEmoji(game.id)} {t.picker.howToPlay}{' '}
          </span>
          {gameHowToPlay(game.id, locale, t.picker.defaultHowToPlay)}
        </div>
      ) : null}
    </div>
  );
}
