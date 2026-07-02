import type { GameLocale } from '../types';
import { ar } from './ar';
import { en } from './en';
import type { ArcadeStrings } from './types';

export type { ArcadeStrings } from './types';

const MESSAGES: Record<GameLocale, ArcadeStrings> = { ar, en };

export function getArcadeStrings(locale: GameLocale): ArcadeStrings {
  return MESSAGES[locale];
}
