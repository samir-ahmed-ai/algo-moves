import type { GameLocale } from '../../locale';
import type { Choice } from './logic';

export type RpsStrings = {
  you: string;
  partner: string;
  /** Sub-header for the two-player best-of-five race. */
  bestOf: (target: number) => string;
  /** Sub-header for the N-player field race. */
  fieldOf: (players: number, rounds: number) => string;
  choiceLabel: Record<Choice, string>;
  makeMove: string;
  lockedIn: string;
  waitingField: (n: number) => string;
  getReady: string;
  roundLabel: (round: number, total: number) => string;
  // Round reveal lines (2-player)
  youTakeIt: string;
  theyGotYou: string;
  tie: string;
  // Match end
  youWin: string;
  peerWins: (name: string) => string;
  winnerIs: (name: string) => string;
  youWinField: string;
  placedNth: (place: number) => string;
  rematch: string;
  finalScore: string;
  // Taunts a player can fling during the reveal beat.
  taunts: string[];
  sendTaunt: string;
  // Spectator
  spectating: string;
};

const STRINGS: Record<GameLocale, RpsStrings> = {
  ar: {
    you: 'أنت',
    partner: 'الخصم',
    bestOf: (target) => `أول من يصل إلى ${target} يفوز · أفضل من خمس`,
    fieldOf: (players, rounds) => `${players} لاعبين · ${rounds} جولات · اهزم الجميع`,
    choiceLabel: { rock: 'حجر', paper: 'ورقة', scissors: 'مقص' },
    makeMove: 'اختر حركتك',
    lockedIn: 'تم التثبيت — بالانتظار…',
    waitingField: (n) => `بانتظار ${n} من اللاعبين…`,
    getReady: 'استعد!',
    roundLabel: (round, total) => `الجولة ${round} / ${total}`,
    youTakeIt: 'لك الجولة! 🙌',
    theyGotYou: 'نالوا منك 😅',
    tie: 'تعادل 🤝',
    youWin: '🎉 لقد فزت!',
    peerWins: (name) => `${name} يفوز`,
    winnerIs: (name) => `🏆 الفائز: ${name}`,
    youWinField: '🎉 تصدرت الميدان!',
    placedNth: (place) => `مركزك: ${place}`,
    rematch: 'أعد المباراة',
    finalScore: 'النتيجة النهائية',
    taunts: ['😏', '🔥', '💪', '😂', '🫡', '🤞'],
    sendTaunt: 'أرسل رمزاً',
    spectating: 'أنت تشاهد',
  },
  en: {
    you: 'You',
    partner: 'Opponent',
    bestOf: (target) => `First to ${target} wins · best of 5`,
    fieldOf: (players, rounds) => `${players} players · ${rounds} rounds · beat the field`,
    choiceLabel: { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' },
    makeMove: 'Make your move',
    lockedIn: 'Locked in — waiting…',
    waitingField: (n) => `Waiting on ${n} player${n === 1 ? '' : 's'}…`,
    getReady: 'Get ready!',
    roundLabel: (round, total) => `Round ${round} / ${total}`,
    youTakeIt: 'You take it! 🙌',
    theyGotYou: 'They got you 😅',
    tie: "It's a tie 🤝",
    youWin: '🎉 You win!',
    peerWins: (name) => `${name} wins`,
    winnerIs: (name) => `🏆 Winner: ${name}`,
    youWinField: '🎉 You topped the field!',
    placedNth: (place) => `You placed #${place}`,
    rematch: 'Rematch',
    finalScore: 'Final score',
    taunts: ['😏', '🔥', '💪', '😂', '🫡', '🤞'],
    sendTaunt: 'Send a taunt',
    spectating: 'You are spectating',
  },
};

export function getRpsStrings(locale: GameLocale): RpsStrings {
  return STRINGS[locale];
}
