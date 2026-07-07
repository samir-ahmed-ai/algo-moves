import type { GameDef } from './types';
import rockPaperScissors from './games/rock-paper-scissors';
import numberDuel from './games/number-duel';
import ticTacToe from './games/tic-tac-toe';
import mindMeld from './games/mind-meld';
import reactionDuel from './games/reaction-duel';
import wouldYouRather from './games/would-you-rather';

/**
 * Every two-player game in the arcade. Add a game by dropping a folder under
 * `games/<id>/` that default-exports a {@link GameDef} and importing it here.
 */
export const GAMES: GameDef[] = [
  wouldYouRather,
  numberDuel,
  ticTacToe,
  rockPaperScissors,
  mindMeld,
  reactionDuel,
];

export function getGame(id: string | null | undefined): GameDef | undefined {
  if (!id) return undefined;
  return GAMES.find((g) => g.id === id);
}
