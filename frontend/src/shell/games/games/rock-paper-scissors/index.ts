import type { GameDef } from '../../types';
import { GAME_ID_ROCK_PAPER_SCISSORS } from '../../_generated/gameIds';
import { RockPaperScissors } from './RockPaperScissors';

const rockPaperScissors: GameDef = {
  id: GAME_ID_ROCK_PAPER_SCISSORS,
  title: 'Rock · Paper · Scissors',
  tagline: 'Lock in your throw — best of five decides it.',
  minutes: '~2 min',
  pace: 'simultaneous',
  minPlayers: 2,
  maxPlayers: 8,
  glyph:
    '<circle cx="13" cy="16" r="6"/><rect x="26" y="9" width="13" height="15" rx="2"/><path d="M11 40l9-9M20 40l-9-9"/>',
  category: 'party',
  accent: '#f59e0b',
  Component: RockPaperScissors,
};

export default rockPaperScissors;
