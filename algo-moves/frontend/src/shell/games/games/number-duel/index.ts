import type { GameDef } from '../../types';
import { NumberDuel } from './NumberDuel';

const numberDuel: GameDef = {
  id: 'number-duel',
  title: 'Number Duel',
  tagline: 'Hide a number 1–100, then race to crack each other’s in the fewest guesses.',
  minutes: '~3 min',
  pace: 'turns',
  glyph: '<path d="M15 19l9-9 9 9"/><path d="M15 29l9 9 9-9"/><circle cx="24" cy="24" r="2.5"/>',
  Component: NumberDuel,
};

export default numberDuel;
