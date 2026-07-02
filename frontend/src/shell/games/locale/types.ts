export type GameLocale = 'ar' | 'en';

export const DEFAULT_GAME_LOCALE: GameLocale = 'en';

export const GAME_LOCALE_KEY = 'algo-moves:games:locale';

export function isGameLocale(value: unknown): value is GameLocale {
  return value === 'ar' || value === 'en';
}

/** Read locale from shared room state (host-authoritative). */
export function localeFromSharedState(sharedState: unknown): GameLocale | null {
  if (sharedState && typeof sharedState === 'object' && 'locale' in sharedState) {
    const locale = (sharedState as { locale?: unknown }).locale;
    return isGameLocale(locale) ? locale : null;
  }
  return null;
}
