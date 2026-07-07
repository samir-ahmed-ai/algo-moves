import type { GameDef } from '../../types';
import { MindMeld } from './MindMeld';
import { getMindMeldStrings } from './strings';

const mindMeld: GameDef = {
  id: 'mind-meld',
  title: 'نسرين',
  tagline: 'Answer this-or-thats and see how in sync you two really are.',
  minutes: '~3 min',
  pace: 'simultaneous',
  minPlayers: 2,
  maxPlayers: 8,
  glyph:
    '<path d="M22 14c-5 0-9 3-9 8 0 3 2 6 5 7v5l5-3"/><path d="M26 14c5 0 9 3 9 8 0 3-2 6-5 7v5l-5-3"/><path d="M20 22c0 2 4 2 4 0M28 22c0 2-4 2-4 0"/>',
  category: 'party',
  Component: MindMeld,
};

/** Localized picker metadata for Mind Meld. */
export function getMindMeldMeta(locale: Parameters<typeof getMindMeldStrings>[0]) {
  const strings = getMindMeldStrings(locale);
  return { title: strings.title, tagline: strings.tagline };
}

export default mindMeld;
