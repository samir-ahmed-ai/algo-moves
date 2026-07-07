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
    <div className="game-chooser">
      <div className="mb-4 flex flex-col items-center gap-2 text-center">
        <span className="rounded-full border border-cyan-300/30 bg-cyan-50/80 px-3 py-1 text-[length:var(--fs-2xs)] font-black uppercase tracking-[0.2em] text-cyan-800 shadow-sm dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">
          Match setup
        </span>
        <h2 className="game-chooser__title text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          {t.room.chooseGame}
        </h2>
        <p className="game-chooser__meta text-sm font-semibold text-slate-500 dark:text-slate-400">
          {t.room.playersHere(playerCount, capacity)}
        </p>
      </div>

      <div className="game-chooser__filters mb-4 flex items-center justify-center">
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

      <div className="game-chooser__grid grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
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
  const paceLabel =
    game.pace === 'turns' ? `🔄 ${t.picker.paceTurns}` : `⚡ ${t.picker.paceTogether}`;

  return (
    <div className="game-chooser-card-shell flex min-w-0 flex-col">
      <div
        className={cn(
          'game-chooser-card group relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border bg-white/76 shadow-sm backdrop-blur transition-all dark:bg-white/5',
          fits
            ? 'hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_44px_rgba(15,23,42,0.14)] dark:hover:bg-white/10'
            : 'opacity-45 grayscale',
        )}
        style={fits ? { borderColor: `${color}38` } : { borderColor: 'rgba(148,163,184,0.32)' }}
      >
        <div
          className="pointer-events-none absolute inset-x-4 top-0 h-px opacity-80"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
        />
        <button
          type="button"
          onClick={onToggleInfo}
          aria-expanded={expanded}
          aria-label={expanded ? t.picker.hideHowToPlay : t.picker.showHowToPlay}
          className="game-chooser-card__info absolute end-2 top-2 z-10 grid h-7 w-7 touch-manipulation place-items-center rounded-full border border-white/60 bg-white/70 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-slate-950/35 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Info className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          disabled={!fits}
          onClick={onChoose}
          className={cn(
            'game-chooser-card__button flex min-h-[11rem] w-full touch-manipulation flex-col items-center gap-2.5 px-2.5 pb-3 pt-5 text-center sm:min-h-[11.5rem]',
            fits ? 'active:scale-[0.98]' : 'cursor-not-allowed',
          )}
        >
          <span
            className="game-chooser-card__glyph grid h-16 w-16 shrink-0 place-items-center rounded-[1.25rem] border border-white/60 shadow-[0_12px_34px_rgba(15,23,42,0.12)] dark:border-white/10 sm:h-[4.5rem] sm:w-[4.5rem]"
            style={{ background: `${color}22`, color }}
          >
            <Glyph markup={game.glyph} className="h-9 w-9 sm:h-10 sm:w-10" />
          </span>

          <span className="flex w-full min-w-0 flex-1 flex-col items-center gap-1">
            <span className="line-clamp-2 text-sm font-black leading-tight text-slate-900 dark:text-white">
              {meta.title}
            </span>
            <span className="flex flex-wrap items-center justify-center gap-1">
              {game.category ? <CategoryBadge category={game.category} /> : null}
              {!fits ? (
                <span className="shrink-0 rounded-full border border-amber-300/40 bg-amber-50/85 px-1.5 py-0.5 text-[length:var(--fs-2xs)] font-bold text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
                  {t.picker.playerRange(cap.min, cap.max)}
                </span>
              ) : null}
            </span>
            <span className="line-clamp-2 text-[length:var(--fs-2xs)] font-medium leading-snug text-slate-500 dark:text-slate-400">
              {fits ? meta.tagline : t.picker.needsPlayers(cap.min, cap.max)}
            </span>
            <span className="mt-auto inline-flex items-center gap-1 rounded-full bg-slate-950/5 px-2 py-1 text-[length:var(--fs-2xs)] font-black uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-300">
              <span>{game.minutes}</span>
              <span className="text-slate-300 dark:text-slate-500">·</span>
              <span>{paceLabel}</span>
            </span>
          </span>
        </button>
      </div>

      {expanded ? (
        <div
          className="game-chooser-card__details -mt-1 rounded-b-[1.4rem] border border-t-0 bg-white/70 px-3 py-2.5 text-[length:var(--fs-tight)] font-medium leading-relaxed text-slate-600 shadow-sm dark:bg-white/5 dark:text-slate-300"
          style={{ borderColor: `${color}30` }}
        >
          <span className="font-black text-slate-950 dark:text-white">
            {gameEmoji(game.id)} {t.picker.howToPlay}{' '}
          </span>
          {gameHowToPlay(game.id, locale, t.picker.defaultHowToPlay)}
        </div>
      ) : null}
    </div>
  );
}
