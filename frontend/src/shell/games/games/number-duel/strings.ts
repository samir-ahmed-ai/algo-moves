import type { GameLocale } from '../../locale';
import { getGameCommonStrings, type GameCommonStrings } from '../../locale/gameCommon';
import type { HeatLevel } from './logic';

export type NumberDuelStrings = GameCommonStrings & {
  title: string;
  tagline: string;
  roundOf: (round: number, total: number) => string;
  peerGuessing: (name: string) => string;
  youGuessing: string;
  pickSecret: string;
  lockItIn: string;
  keeperThinking: (name: string, min: number, max: number) => string;
  yourSecret: string;
  peerIsGuessing: (name: string, count: number) => string;
  yourGuess: string;
  guessCta: (value: number) => string;
  checking: string;
  narrowedTo: string;
  proximity: string;
  guessCount: (n: number) => string;
  crackedIt: (count: number) => string;
  peerNeeded: (name: string, count: number) => string;
  swappingRoles: string;
  timeUp: string;
  youWin: string;
  peerWins: (name: string) => string;
  tie: string;
  matchSummary: (mine: number, peer: number, name: string) => string;
  spectatorRound: (keeper: string, guesser: string) => string;
  spectatorSecretHidden: string;
  guessFeed: string;
  heat: Record<HeatLevel, string>;
};

const STRINGS: Record<GameLocale, NumberDuelStrings> = {
  ar: {
    ...getGameCommonStrings('ar'),
    title: 'مبارزة الأرقام',
    tagline: 'أخفِ رقماً بين ١ و١٠٠، ثم تسابقا لكشف رقم الخصم بأقل عدد من التخمينات.',
    roundOf: (round, total) => `الجولة ${round} من ${total}`,
    peerGuessing: (name) => `${name} يخمّن`,
    youGuessing: 'أنت تخمّن',
    pickSecret: 'اختر رقماً سرياً',
    lockItIn: 'ثبّت الرقم',
    keeperThinking: (name, min, max) => `${name} يفكّر في رقم بين ${min} و${max}…`,
    yourSecret: 'رقمك السري',
    peerIsGuessing: (name, count) => `${name} يخمّن… ${count} حتى الآن`,
    yourGuess: 'تخمينك',
    guessCta: (value) => `خمّن ${value}`,
    checking: 'جارٍ التحقق…',
    narrowedTo: 'النطاق المتبقي',
    proximity: 'القرب',
    guessCount: (n) => `${n} تخمين`,
    crackedIt: (count) => `كشفته في ${count}! 🎯`,
    peerNeeded: (name, count) => `${name} احتاج ${count} تخمينات`,
    swappingRoles: 'تبديل الأدوار…',
    timeUp: 'انتهى الوقت! خمّن الآن',
    youWin: '🏆 فزت!',
    peerWins: (name) => `${name} فاز`,
    tie: 'تعادل!',
    matchSummary: (mine, peer, name) => `أنت: ${mine} تخمينات · ${name}: ${peer} تخمينات`,
    spectatorRound: (keeper, guesser) => `${keeper} يخفي · ${guesser} يخمّن`,
    spectatorSecretHidden: 'الرقم السري مخفي',
    guessFeed: 'سجل التخمينات',
    heat: {
      burning: 'ساخن جداً 🔥',
      hot: 'ساخن 🌶️',
      warm: 'دافئ ☀️',
      cold: 'بارد ❄️',
      freezing: 'متجمّد 🧊',
    },
  },
  en: {
    ...getGameCommonStrings('en'),
    title: 'Number Duel',
    tagline: 'Hide a number 1–100, then race to crack each other’s in the fewest guesses.',
    roundOf: (round, total) => `Round ${round} of ${total}`,
    peerGuessing: (name) => `${name} is guessing`,
    youGuessing: 'You are guessing',
    pickSecret: 'Pick a secret number',
    lockItIn: 'Lock it in',
    keeperThinking: (name, min, max) => `${name} is thinking of a number ${min}–${max}…`,
    yourSecret: 'Your secret',
    peerIsGuessing: (name, count) => `${name} is guessing… ${count} so far`,
    yourGuess: 'Your guess',
    guessCta: (value) => `Guess ${value}`,
    checking: 'Checking…',
    narrowedTo: 'Range left',
    proximity: 'Proximity',
    guessCount: (n) => `${n} ${n === 1 ? 'guess' : 'guesses'}`,
    crackedIt: (count) => `You cracked it in ${count}! 🎯`,
    peerNeeded: (name, count) => `${name} needed ${count} guesses`,
    swappingRoles: 'Swapping roles…',
    timeUp: 'Time’s up! Guess now',
    youWin: '🏆 You win!',
    peerWins: (name) => `${name} wins`,
    tie: 'It’s a tie!',
    matchSummary: (mine, peer, name) => `You: ${mine} guesses · ${name}: ${peer} guesses`,
    spectatorRound: (keeper, guesser) => `${keeper} hides · ${guesser} guesses`,
    spectatorSecretHidden: 'Secret hidden',
    guessFeed: 'Guess feed',
    heat: {
      burning: 'Burning 🔥',
      hot: 'Hot 🌶️',
      warm: 'Warm ☀️',
      cold: 'Cold ❄️',
      freezing: 'Freezing 🧊',
    },
  },
};

export function getNumberDuelStrings(locale: GameLocale): NumberDuelStrings {
  return STRINGS[locale];
}
