import type { GameLocale } from '../../locale';
import { getGameCommonStrings, type GameCommonStrings } from '../../locale/gameCommon';
import type { CompatibilityKey } from './logic';

export type MindMeldStrings = GameCommonStrings & {
  title: string;
  tagline: string;
  thisOrThat: string;
  inSyncTitle: (score: number, total: number) => string;
  groupSyncTitle: (percent: number) => string;
  inSync: string;
  offThisTime: string;
  groupInSync: (percent: number) => string;
  waitingFor: (name: string) => string;
  waitingForGroup: (remaining: number) => string;
  pickTogether: string;
  inSyncCount: (score: number) => string;
  syncPercentBadge: (percent: number) => string;
  compatibility: Record<CompatibilityKey, string>;
  timesUp: string;
  historyTitle: string;
  historyEmpty: string;
  spectatorWaiting: string;
  answered: (done: number, of: number) => string;
};

const STRINGS: Record<GameLocale, MindMeldStrings> = {
  ar: {
    ...getGameCommonStrings('ar'),
    title: 'نسرين',
    tagline: 'أجيبوا على أسئلة «هذا أم ذاك» واكتشفوا مدى تزامنكم.',
    thisOrThat: 'هذا أم ذاك؟',
    inSyncTitle: (score, total) => `متزامنان ${score} / ${total}`,
    groupSyncTitle: (percent) => `تزامن المجموعة ${percent}٪`,
    inSync: 'متزامنان! 💞',
    offThisTime: 'مختلفان هذه المرة',
    groupInSync: (percent) => `المجموعة متزامنة ${percent}٪`,
    waitingFor: (name) => `بانتظار ${name}…`,
    waitingForGroup: (remaining) =>
      remaining === 1 ? 'بانتظار لاعب واحد…' : `بانتظار ${remaining} لاعبين…`,
    pickTogether: 'اختاروا معاً',
    inSyncCount: (score) => `${score} متزامن`,
    syncPercentBadge: (percent) => `${percent}٪ تزامن`,
    compatibility: {
      twoPeas: 'قرينان متلازمان 🫛',
      prettyInTune: 'متناغمان 💫',
      opposites: 'الأضداد تتجاذب ✨',
    },
    timesUp: 'انتهى الوقت!',
    historyTitle: 'اللحظات المتزامنة',
    historyEmpty: 'لا تطابقات بعد — اختاروا معاً!',
    spectatorWaiting: 'بانتظار بدء اللاعبين…',
    answered: (done, of) => `أجاب ${done} / ${of}`,
  },
  en: {
    ...getGameCommonStrings('en'),
    title: 'نسرين',
    tagline: 'Answer this-or-thats and see how in sync you all really are.',
    thisOrThat: 'This or that?',
    inSyncTitle: (score, total) => `In sync ${score} / ${total}`,
    groupSyncTitle: (percent) => `Group sync ${percent}%`,
    inSync: 'In sync! 💞',
    offThisTime: 'Off this time',
    groupInSync: (percent) => `${percent}% of the group agreed`,
    waitingFor: (name) => `Waiting for ${name}…`,
    waitingForGroup: (remaining) =>
      remaining === 1 ? 'Waiting for 1 player…' : `Waiting for ${remaining} players…`,
    pickTogether: 'Pick together',
    inSyncCount: (score) => `${score} in sync`,
    syncPercentBadge: (percent) => `${percent}% sync`,
    compatibility: {
      twoPeas: 'Two peas in a pod 🫛',
      prettyInTune: 'Pretty in tune 💫',
      opposites: 'Opposites attract ✨',
    },
    timesUp: "Time's up!",
    historyTitle: 'In-sync moments',
    historyEmpty: 'No matches yet — pick together!',
    spectatorWaiting: 'Waiting for the players to begin…',
    answered: (done, of) => `${done} / ${of} answered`,
  },
};

export function getMindMeldStrings(locale: GameLocale): MindMeldStrings {
  return STRINGS[locale];
}
