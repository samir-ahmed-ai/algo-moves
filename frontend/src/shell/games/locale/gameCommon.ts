import type { GameLocale } from './types';

/** Shared string keys duplicated across per-game locale files. */
export type GameCommonStrings = {
  you: string;
  partner: string;
  playAgain: string;
  spectating: string;
};

const COMMON: Record<GameLocale, GameCommonStrings> = {
  en: {
    you: 'You',
    partner: 'Partner',
    playAgain: 'Play again',
    spectating: 'Spectating',
  },
  ar: {
    you: 'أنت',
    partner: 'الشريك',
    playAgain: 'العب مجدداً',
    spectating: 'تشاهد',
  },
};

/** Canonical shared game strings for a locale. Spread into per-game string tables. */
export function getGameCommonStrings(locale: GameLocale): GameCommonStrings {
  return COMMON[locale];
}
