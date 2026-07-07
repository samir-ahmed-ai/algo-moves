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

const HOW_TO_PLAY: Record<GameLocale, Record<string, string>> = {
  en: {
    'would-you-rather':
      'Both choose between two options simultaneously. Match = +2 pts each. Differ = +1 each. 8 rounds.',
    'number-duel':
      "Each player hides a secret number 1–100. Race to guess your opponent's in fewest tries. Roles swap each round.",
    'tic-tac-toe':
      'Classic 3×3 grid. Get three in a row to win. 15 s turn timer — miss it and a move is auto-played.',
    'rock-paper-scissors':
      'Lock in your throw, then reveal together. Best of 5 wins. Throw in taunts during the countdown!',
    'mind-meld':
      'Both pick from this-or-that prompts simultaneously. Score goes up for every matching answer. 12 s per round.',
    'reaction-duel':
      'Wait for the screen to go green, then tap as fast as you can. False start = penalty. First to target wins.',
  },
  ar: {
    'would-you-rather':
      'يختار كل لاعب بين خيارين في نفس الوقت. التطابق = +2 نقطة لكلٍ. الاختلاف = +1 لكلٍ. 8 جولات.',
    'number-duel':
      'يخفي كل لاعب رقماً سرياً من 1 إلى 100. سباق لتخمين رقم الخصم بأقل محاولات. الأدوار تتبدل كل جولة.',
    'tic-tac-toe':
      'شبكة 3×3 كلاسيكية. اجمع ثلاثة في صف للفوز. مؤقت 15 ثانية لكل دور — إن انتهى يُلعب تلقائياً.',
    'rock-paper-scissors':
      'ثبّت رميتك ثم اكشفوا معاً. أفضل من 5 جولات يفوز. أرسل استفزازات أثناء العد التنازلي!',
    'mind-meld':
      'يختار كل لاعب من مطالبات هذا أو ذاك في نفس الوقت. ترتفع النقاط مع كل إجابة متطابقة. 12 ثانية لكل جولة.',
    'reaction-duel':
      'انتظر حتى يتحول اللون إلى الأخضر ثم اضغط بأسرع ما يمكن. البدء المبكر = عقوبة. أول من يصل للهدف يفوز.',
  },
};

export function gameAccentColor(game: GameDef | string): string {
  if (typeof game === 'object' && game.accent) return game.accent;
  return 'var(--accent)';
}

export function gameEmoji(gameId: string): string {
  return GAME_EMOJI[gameId] ?? '🎮';
}

export function gameHowToPlay(gameId: string, locale: GameLocale, fallback: string): string {
  return HOW_TO_PLAY[locale][gameId] ?? fallback;
}
