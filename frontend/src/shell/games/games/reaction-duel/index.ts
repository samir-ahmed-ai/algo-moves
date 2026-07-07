import type { GameDef } from '../../types';
import { GAME_ID_REACTION_DUEL } from '../../_generated/gameIds';
import { ReactionDuel } from './ReactionDuel';

const reactionDuel: GameDef = {
  id: GAME_ID_REACTION_DUEL,
  title: 'Reaction Duel',
  tagline: 'Tap the moment it turns green — fastest wins.',
  minutes: '~2 min',
  pace: 'simultaneous',
  minPlayers: 2,
  maxPlayers: 8,
  glyph:
    '<path d="M25 5 11 27h11l-2 16 15-24H23l2-14z" fill="currentColor" stroke="none"/><path d="M25 5 11 27h11l-2 16 15-24H23l2-14z"/>',
  category: 'party',
  accent: '#10b981',
  Component: ReactionDuel,
};

export default reactionDuel;
