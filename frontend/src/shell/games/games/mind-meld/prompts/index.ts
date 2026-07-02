import type { GameLocale } from '../../../locale';
import { MELD_PROMPTS_AR } from './ar';
import { MELD_PROMPTS_EN } from './en';
import type { MeldPrompt } from './types';

export type { MeldPrompt } from './types';

const PROMPTS_BY_LOCALE: Record<GameLocale, MeldPrompt[]> = {
  ar: MELD_PROMPTS_AR,
  en: MELD_PROMPTS_EN,
};

export function getMeldPrompts(locale: GameLocale): MeldPrompt[] {
  return PROMPTS_BY_LOCALE[locale];
}
