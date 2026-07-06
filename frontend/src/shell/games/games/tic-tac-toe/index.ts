import type { GameDef } from '../../types';
import { TicTacToe } from './TicTacToe';
import { getTicTacToeStrings } from './strings';

const ticTacToe: GameDef = {
  id: 'tic-tac-toe',
  title: 'Tic-Tac-Toe',
  tagline: 'Three in a row — X moves first, O answers back.',
  minutes: '~1 min',
  pace: 'turns',
  glyph:
    '<path d="M20 8v32M28 8v32M8 20h32M8 28h32"/><path d="M11 11l6 6M17 11l-6 6"/><circle cx="38" cy="38" r="4"/>',
  category: 'couple',
  Component: TicTacToe,
};

/** Localized picker metadata for Tic-Tac-Toe. */
export function getTicTacToeMeta(locale: Parameters<typeof getTicTacToeStrings>[0]) {
  const strings = getTicTacToeStrings(locale);
  return { title: strings.title, tagline: strings.tagline };
}

export default ticTacToe;
