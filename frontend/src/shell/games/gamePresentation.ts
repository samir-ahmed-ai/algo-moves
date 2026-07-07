import type { GameLocale } from './locale';
import type { GameDef } from './types';

const GAME_EMOJI: Record<string, string> = {
  'would-you-rather': '💕',
  'number-duel': '🔢',
  'tic-tac-toe': '⭕',
  'rock-paper-scissors': '✊',
  'mind-meld': '🧠',
  'reaction-duel': '⚡',
};

const GAME_ACCENT: Record<string, string> = {
  'would-you-rather': '#db2777',
  'number-duel': '#4f46e5',
  'tic-tac-toe': '#0ea5e9',
  'rock-paper-scissors': '#f59e0b',
  'mind-meld': '#8b5cf6',
  'reaction-duel': '#10b981',
};

const HOW_TO_PLAY: Record<GameLocale, Record<string, string>> = {
  en: {
    'would-you-rather':
      'Pick between two options at the same time. Matching answers score highest, split answers still move the round forward.',
    'number-duel':
      'Hide a secret number from 1 to 100, then race to crack the other player’s number in the fewest guesses.',
    'tic-tac-toe':
      'Classic 3×3 tactics with a live turn clock. Build three in a row before the board fills.',
    'rock-paper-scissors':
      'Lock your throw, reveal together, and win the best-of-five race. Send quick taunts during reveal beats.',
    'mind-meld':
      'Answer this-or-that prompts together and chase a higher sync score across the full set.',
    'reaction-duel':
      'Hold steady until green, then tap first. Jumping early becomes a false start penalty.',
  },
  ar: {
    'would-you-rather':
      'اختر بين خيارين في نفس اللحظة. الإجابات المتطابقة تسجل أعلى نتيجة، والاختلاف لا يوقف الجولة.',
    'number-duel':
      'اخف رقماً من 1 إلى 100، ثم سابق لاكتشاف رقم اللاعب الآخر بأقل عدد من التخمينات.',
    'tic-tac-toe':
      'تكتيك 3×3 كلاسيكي مع مؤقت حي لكل دور. اصنع ثلاثة على خط واحد قبل امتلاء اللوحة.',
    'rock-paper-scissors':
      'ثبّت رميتك ثم اكشفوا معاً في سباق أفضل من خمس. أرسل استفزازات سريعة أثناء لحظات الكشف.',
    'mind-meld': 'أجيبوا على أسئلة هذا أو ذاك معاً، وحاولوا رفع نسبة الانسجام عبر المجموعة كاملة.',
    'reaction-duel': 'انتظر حتى يظهر الأخضر، ثم اضغط أولاً. الضغط المبكر يتحول إلى عقوبة بدء خاطئ.',
  },
};

export function gameAccentColor(game: GameDef | string): string {
  if (typeof game === 'object' && game.accent) return game.accent;
  if (typeof game === 'string') return GAME_ACCENT[game] ?? 'var(--accent)';
  return 'var(--accent)';
}

export function gameEmoji(gameId: string): string {
  return GAME_EMOJI[gameId] ?? '🎮';
}

export function gameHowToPlay(gameId: string, locale: GameLocale, fallback: string): string {
  return HOW_TO_PLAY[locale][gameId] ?? fallback;
}
