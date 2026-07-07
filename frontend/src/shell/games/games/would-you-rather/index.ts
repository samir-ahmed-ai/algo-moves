import type { GameDef } from '../../types';
import { GAME_ID_WOULD_YOU_RATHER } from '../../_generated/gameIds';
import { WouldYouRather } from './WouldYouRather';

const wouldYouRather: GameDef = {
  id: GAME_ID_WOULD_YOU_RATHER,
  title: 'Would You Rather?',
  tagline: 'Two impossible choices. Which do you pick — and does your partner agree?',
  minutes: '~4 min',
  pace: 'simultaneous',
  minPlayers: 2,
  maxPlayers: 2,
  category: 'couple',
  accent: '#e879a0',
  glyph:
    '<path d="M12 24h24M24 12v24"/><circle cx="18" cy="18" r="4"/><circle cx="30" cy="30" r="4"/><path d="M14 30c0-2.2 1.8-4 4-4s4 1.8 4 4M26 18c0-2.2 1.8-4 4-4s4 1.8 4 4"/>',
  Component: WouldYouRather,
};

export default wouldYouRather;
