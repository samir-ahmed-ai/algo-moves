import type { GameLocale } from '../../locale';
import type { CompatibilityKey } from './logic';

export type MindMeldStrings = {
  title: string;
  tagline: string;
  thisOrThat: string;
  inSyncTitle: (score: number, total: number) => string;
  playAgain: string;
  inSync: string;
  offThisTime: string;
  waitingFor: (name: string) => string;
  pickTogether: string;
  inSyncCount: (score: number) => string;
  you: string;
  partner: string;
  compatibility: Record<CompatibilityKey, string>;
};

const STRINGS: Record<GameLocale, MindMeldStrings> = {
  ar: {
    title: 'تطابق العقول',
    tagline: 'أجيبا على أسئلة «هذا أم ذاك» واكتشفا مدى تزامنكما.',
    thisOrThat: 'هذا أم ذاك؟',
    inSyncTitle: (score, total) => `متزامنان ${score} / ${total}`,
    playAgain: 'العب مجدداً',
    inSync: 'متزامنان! 💞',
    offThisTime: 'مختلفان هذه المرة',
    waitingFor: (name) => `بانتظار ${name}…`,
    pickTogether: 'اختارا معاً',
    inSyncCount: (score) => `${score} متزامن`,
    you: 'أنت',
    partner: 'الشريك',
    compatibility: {
      twoPeas: 'قرينان متلازمان 🫛',
      prettyInTune: 'متناغمان 💫',
      opposites: 'الأضداد تتجاذب ✨',
    },
  },
  en: {
    title: 'Mind Meld',
    tagline: 'Answer this-or-thats and see how in sync you two really are.',
    thisOrThat: 'This or that?',
    inSyncTitle: (score, total) => `In sync ${score} / ${total}`,
    playAgain: 'Play again',
    inSync: 'In sync! 💞',
    offThisTime: 'Off this time',
    waitingFor: (name) => `Waiting for ${name}…`,
    pickTogether: 'Pick together',
    inSyncCount: (score) => `${score} in sync`,
    you: 'You',
    partner: 'Partner',
    compatibility: {
      twoPeas: 'Two peas in a pod 🫛',
      prettyInTune: 'Pretty in tune 💫',
      opposites: 'Opposites attract ✨',
    },
  },
};

export function getMindMeldStrings(locale: GameLocale): MindMeldStrings {
  return STRINGS[locale];
}
