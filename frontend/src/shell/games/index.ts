/**
 * Public barrel for the games arcade domain. Cross-feature imports must use
 * `@/shell/games` — not deep paths under `shell/games/**`.
 */
export { GamesPage } from './GamesPage';
export { GAMES, getGame } from './registry';
export type { GameDef } from './types';
export { gameCapacity } from './types';
export { GamesLocaleProvider, getArcadeStrings, useGamesLocale } from './locale';
export type { GameLocale } from './locale';
export { useCountdown, useRematch, useReportOnce } from './engine';
export { GAME_IDS, GAME_CATALOG, type GameId } from './_generated/gameIds';
