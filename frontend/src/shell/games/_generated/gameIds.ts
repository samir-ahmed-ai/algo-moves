/** Generated from db/migrations/010_games_catalog.sql — do not edit. */
export const GAME_ID_WOULD_YOU_RATHER = 'would-you-rather' as const;
export const GAME_ID_NUMBER_DUEL = 'number-duel' as const;
export const GAME_ID_TIC_TAC_TOE = 'tic-tac-toe' as const;
export const GAME_ID_ROCK_PAPER_SCISSORS = 'rock-paper-scissors' as const;
export const GAME_ID_MIND_MELD = 'mind-meld' as const;
export const GAME_ID_REACTION_DUEL = 'reaction-duel' as const;

export type GameId =
  | 'would-you-rather'
  | 'number-duel'
  | 'tic-tac-toe'
  | 'rock-paper-scissors'
  | 'mind-meld'
  | 'reaction-duel';

export const GAME_IDS = [
  GAME_ID_WOULD_YOU_RATHER,
  GAME_ID_NUMBER_DUEL,
  GAME_ID_TIC_TAC_TOE,
  GAME_ID_ROCK_PAPER_SCISSORS,
  GAME_ID_MIND_MELD,
  GAME_ID_REACTION_DUEL,
] as const satisfies readonly GameId[];

export const GAME_CATALOG = [
  { id: GAME_ID_WOULD_YOU_RATHER, title: 'Would You Rather', sortOrder: 1 },
  { id: GAME_ID_NUMBER_DUEL, title: 'Number Duel', sortOrder: 2 },
  { id: GAME_ID_TIC_TAC_TOE, title: 'Tic-Tac-Toe', sortOrder: 3 },
  { id: GAME_ID_ROCK_PAPER_SCISSORS, title: 'Rock Paper Scissors', sortOrder: 4 },
  { id: GAME_ID_MIND_MELD, title: 'Mind Meld', sortOrder: 5 },
  { id: GAME_ID_REACTION_DUEL, title: 'Reaction Duel', sortOrder: 6 },
] as const;
