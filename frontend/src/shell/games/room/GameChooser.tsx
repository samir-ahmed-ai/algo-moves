import { useState } from 'react';
import { Filter, Info, Heart, PartyPopper, Users } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { FeatureSelectorPopover } from '@/components/shared';
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

      <div className="mb-4 flex items-center justify-center">
        <FeatureSelectorPopover
          groups={[
            {
              options: FILTER_TABS.map((tab) => ({
                id: tab,
                icon: tab === 'all' ? <Filter /> : tab === 'couple' ? <Heart /> : <PartyPopper />,
                title: t.picker[FILTER_LABEL_KEY[tab]],
                subtitle:
                  tab === 'all'
                    ? t.picker.filterAll
                    : tab === 'couple'
                      ? 'Two-player games'
                      : 'Group games',
                detailTitle: t.picker[FILTER_LABEL_KEY[tab]],
                detailDescription:
                  tab === 'all'
                    ? 'Show every game in the room.'
                    : tab === 'couple'
                      ? 'Games designed for pairs.'
                      : 'Games that work best with a party.',
              })),
            },
          ]}
          value={filter}
          onChange={(id) => setFilter(id as FilterTab)}
          panelTitle={t.room.chooseGame}
          panelHint={t.room.playersHere(playerCount, capacity)}
          triggerLabel={t.picker[FILTER_LABEL_KEY[filter]]}
          triggerIcon={<Users className="h-3.5 w-3.5" />}
          align="right"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
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
    <div className="flex min-w-0 flex-col">
      <div
        className={cn(
          'group relative flex h-full flex-col rounded-2xl border-2 bg-panel/70 transition-all',
          fits ? 'hover:-translate-y-0.5 hover:bg-panel hover:shadow-[var(--shadow-md)]' : 'opacity-50',
        )}
        style={fits ? { borderColor: `${color}40` } : { borderColor: 'var(--edge)' }}
      >
        <button
          type="button"
          onClick={onToggleInfo}
          aria-expanded={expanded}
          aria-label={expanded ? t.picker.hideHowToPlay : t.picker.showHowToPlay}
          className="absolute end-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full text-ink3 hover:bg-panel2 hover:text-ink transition-colors touch-manipulation"
        >
          <Info className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          disabled={!fits}
          onClick={onChoose}
          className={cn(
            'flex min-h-[10.5rem] w-full flex-col items-center gap-2.5 px-2.5 pb-3 pt-4 text-center touch-manipulation sm:min-h-[11rem]',
            fits ? 'active:scale-[0.98]' : 'cursor-not-allowed',
          )}
        >
          <span
            className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl sm:h-[4.5rem] sm:w-[4.5rem]"
            style={{ background: `${color}22`, color }}
          >
            <Glyph markup={game.glyph} className="h-9 w-9 sm:h-10 sm:w-10" />
          </span>

          <span className="flex w-full min-w-0 flex-1 flex-col items-center gap-1">
            <span className="line-clamp-2 text-sm font-bold leading-tight text-ink">{meta.title}</span>
            <span className="flex flex-wrap items-center justify-center gap-1">
              {game.category ? <CategoryBadge category={game.category} /> : null}
              {!fits ? (
                <span className="shrink-0 rounded-full border border-edge bg-panel2 px-1.5 py-0.5 text-[length:var(--fs-2xs)] font-semibold text-ink3">
                  {t.picker.playerRange(cap.min, cap.max)}
                </span>
              ) : null}
            </span>
            <span className="line-clamp-2 text-[length:var(--fs-2xs)] leading-snug text-ink3">
              {fits ? meta.tagline : t.picker.needsPlayers(cap.min, cap.max)}
            </span>
            <span className="mt-auto inline-flex items-center gap-1 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">
              <span>{game.minutes}</span>
              <span className="text-edge2">·</span>
              <span>{paceLabel}</span>
            </span>
          </span>
        </button>
      </div>

      {expanded ? (
        <div
          className="-mt-1 rounded-b-2xl border border-t-0 bg-panel2 px-3 py-2.5 text-[length:var(--fs-tight)] text-ink2 leading-relaxed"
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
