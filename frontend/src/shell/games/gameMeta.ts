import { getMindMeldMeta } from './games/mind-meld';
import type { GameLocale } from './locale';
import type { GameDef } from './types';

const GAME_META: Record<GameLocale, Record<string, Pick<GameDef, 'title' | 'tagline'>>> = {
  en: {
    'would-you-rather': {
      title: 'Would You Rather',
      tagline: 'Fast this-or-that choices that reveal how closely the room thinks.',
    },
    'number-duel': {
      title: 'Number Duel',
      tagline: 'Hide a number, read the clues, and crack the code first.',
    },
    'tic-tac-toe': {
      title: 'Tic Tac Toe',
      tagline: 'A clean three-in-a-row duel with live turn pressure.',
    },
    'rock-paper-scissors': {
      title: 'Rock Paper Scissors',
      tagline: 'Lock a throw, reveal together, and win the best-of-five race.',
    },
    'reaction-duel': {
      title: 'Reaction Duel',
      tagline: 'Wait for green, avoid the false start, and hit first.',
    },
  },
  ar: {
    'would-you-rather': {
      title: 'ماذا تفضل؟',
      tagline: 'اختيارات سريعة تكشف مدى تقارب تفكير الغرفة.',
    },
    'number-duel': {
      title: 'مبارزة الأرقام',
      tagline: 'اخف رقماً، اقرأ التلميحات، واكسر الرمز أولاً.',
    },
    'tic-tac-toe': {
      title: 'إكس أو',
      tagline: 'مبارزة ثلاثية الصف مع ضغط حي لكل دور.',
    },
    'rock-paper-scissors': {
      title: 'حجر ورقة مقص',
      tagline: 'ثبّت رميتك، اكشفوا معاً، وافز بسباق الأفضل من خمس.',
    },
    'reaction-duel': {
      title: 'مبارزة السرعة',
      tagline: 'انتظر الأخضر، تجنب البداية الخاطئة، واضغط أولاً.',
    },
  },
};

/** Localized title + tagline for a game card (mind-meld ships its own strings). */
export function localizedGameMeta(
  game: GameDef,
  locale: GameLocale,
): Pick<GameDef, 'title' | 'tagline'> {
  if (game.id === 'mind-meld') return getMindMeldMeta(locale);
  return GAME_META[locale][game.id] ?? { title: game.title, tagline: game.tagline };
}
