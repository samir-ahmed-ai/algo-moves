import type { GameLocale } from '../../locale';

export type ReactionDuelStrings = {
  title: string;
  tagline: string;
  you: string;
  partner: string;
  firstTo: (target: number) => string;
  tapWhenGreen: string;
  getReady: string;
  waitForGreen: string;
  doNotTapYet: string;
  tapNow: string;
  now: string;
  goTap: string;
  waitingForYou: string; // "waiting for others to tap…" (N-player)
  waitingForPeer: (name: string) => string;
  tooSoon: string;
  falseStartLose: string;
  roundDone: string;
  yourTime: (ms: string) => string;
  youTookIt: string;
  peerWasFaster: (name: string) => string;
  deadHeat: string;
  falseStart: string;
  ms: (n: number) => string;
  noTime: string;
  round: (n: number) => string;
  youWin: string;
  peerWins: (name: string) => string;
  matchTie: string;
  playAgain: string;
  history: string;
  spectating: string;
  liveRound: (n: number) => string;
  fastestWins: string;
  racersReady: (n: number) => string;
};

const STRINGS: Record<GameLocale, ReactionDuelStrings> = {
  ar: {
    title: 'مبارزة رد الفعل',
    tagline: 'انقر لحظة تحوّله إلى الأخضر — الأسرع يفوز.',
    you: 'أنت',
    partner: 'الخصم',
    firstTo: (target) => `أول من يصل إلى ${target} يفوز`,
    tapWhenGreen: 'انقر فور تحوّله إلى الأخضر',
    getReady: 'استعد…',
    waitForGreen: 'انتظر الأخضر…',
    doNotTapYet: 'لا تنقر بعد!',
    tapNow: 'انقر!',
    now: 'الآن!',
    goTap: 'انطلق — انقر!',
    waitingForYou: 'بانتظار بقية اللاعبين…',
    waitingForPeer: (name) => `بانتظار ${name}…`,
    tooSoon: 'مبكر جداً! 😬',
    falseStartLose: 'بداية خاطئة — خسرت هذه الجولة.',
    roundDone: 'انتهت الجولة.',
    yourTime: (ms) => `أنت: ${ms}`,
    youTookIt: 'فزت بها! 🙌',
    peerWasFaster: (name) => `${name} كان أسرع`,
    deadHeat: 'تعادل تام 🤝',
    falseStart: 'بداية خاطئة',
    ms: (n) => `${n} مي.ث`,
    noTime: '—',
    round: (n) => `الجولة ${n}`,
    youWin: '⚡ فزت!',
    peerWins: (name) => `${name} يفوز`,
    matchTie: 'تعادل!',
    playAgain: 'العب مجدداً',
    history: 'أزمنة الجولات',
    spectating: 'تشاهد',
    liveRound: (n) => `جولة مباشرة ${n}`,
    fastestWins: 'أسرع نقرة صحيحة تفوز بالجولة',
    racersReady: (n) => `${n} متسابقين مستعدون`,
  },
  en: {
    title: 'Reaction Duel',
    tagline: 'Tap the moment it turns green — fastest wins.',
    you: 'You',
    partner: 'Opponent',
    firstTo: (target) => `First to ${target} wins`,
    tapWhenGreen: 'tap the instant it turns green',
    getReady: 'Get ready…',
    waitForGreen: 'Wait for green…',
    doNotTapYet: 'Do not tap yet!',
    tapNow: 'TAP!',
    now: 'Now!',
    goTap: 'GO — tap!',
    waitingForYou: 'Waiting for the others to tap…',
    waitingForPeer: (name) => `Waiting for ${name}…`,
    tooSoon: 'Too soon! 😬',
    falseStartLose: 'False start — you lose this round.',
    roundDone: 'Round done.',
    yourTime: (ms) => `You: ${ms}`,
    youTookIt: 'You took it! 🙌',
    peerWasFaster: (name) => `${name} was faster`,
    deadHeat: 'Dead heat 🤝',
    falseStart: 'false start',
    ms: (n) => `${n} ms`,
    noTime: '—',
    round: (n) => `Round ${n}`,
    youWin: '⚡ You win!',
    peerWins: (name) => `${name} wins`,
    matchTie: 'Match tied!',
    playAgain: 'Play again',
    history: 'Round times',
    spectating: 'Spectating',
    liveRound: (n) => `Live · round ${n}`,
    fastestWins: 'fastest valid tap wins the round',
    racersReady: (n) => `${n} racers ready`,
  },
};

export function getReactionDuelStrings(locale: GameLocale): ReactionDuelStrings {
  return STRINGS[locale];
}
