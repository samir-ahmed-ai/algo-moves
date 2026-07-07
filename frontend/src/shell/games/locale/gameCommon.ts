import type { GameLocale } from './types';

/** Shared string keys duplicated across per-game locale files. */
export type GameCommonStrings = Readonly<{
  you: string;
  partner: string;
  playAgain: string;
  spectating: string;
}>;

const COMMON: Record<GameLocale, GameCommonStrings> = {
  en: {
    you: 'You',
    partner: 'Player two',
    playAgain: 'Run it back',
    spectating: 'Spectating',
  },
  ar: {
    you: 'أنت',
    partner: 'اللاعب الثاني',
    playAgain: 'ابدأ جولة جديدة',
    spectating: 'تشاهد',
  },
};

/** Canonical shared game strings for a locale. Spread into per-game string tables. */
export function getGameCommonStrings(locale: GameLocale): GameCommonStrings {
  return COMMON[locale];
}
