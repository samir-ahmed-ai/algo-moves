import { getMindMeldMeta } from './games/mind-meld';
import type { GameLocale } from './locale';
import type { GameDef } from './types';

/** Localized title + tagline for a game card (mind-meld ships its own strings). */
export function localizedGameMeta(
  game: GameDef,
  locale: GameLocale,
): Pick<GameDef, 'title' | 'tagline'> {
  if (game.id === 'mind-meld') return getMindMeldMeta(locale);
  return { title: game.title, tagline: game.tagline };
}
