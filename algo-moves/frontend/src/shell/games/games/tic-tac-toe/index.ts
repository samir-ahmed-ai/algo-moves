import type { GameDef } from '../../types';
import { TicTacToe } from './TicTacToe';

const ticTacToe: GameDef = {
  id: 'tic-tac-toe',
  title: 'Tic-Tac-Toe',
  tagline: 'Three in a row — X moves first, O answers back.',
  minutes: '~1 min',
  pace: 'turns',
  glyph:
    '<path d="M20 8v32M28 8v32M8 20h32M8 28h32"/><path d="M11 11l6 6M17 11l-6 6"/><circle cx="38" cy="38" r="4"/>',
  Component: TicTacToe,
};

export default ticTacToe;
