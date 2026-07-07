import type { ComponentType } from 'react';

export type GamePace = 'turns' | 'simultaneous';
export type GameCategory = 'couple' | 'party';
export type GameCapacity = Readonly<{ min: number; max: number }>;

export const DEFAULT_GAME_CAPACITY: GameCapacity = { min: 2, max: 2 };

/**
 * A game plugged into the arcade. Each game lives in `games/<id>/` and
 * default-exports a `GameDef`; `registry.ts` collects those definitions.
 *
 * Game components render inside the shared room shell and own their match
 * state, either through nested room state or relayed channel messages.
 */
export interface GameDef extends Readonly<{
  /** Stable id, also used in the shared room state and analytics. */
  id: string;
  /** Default title. Use `localizedGameMeta` for user-facing cards. */
  title: string;
  /** Default one-line hook. Use `localizedGameMeta` for user-facing cards. */
  tagline: string;
  /** Inner-SVG mnemonic markup (viewBox 0 0 48 48), same house style as problem glyphs. */
  glyph: string;
  /** Rough session length, e.g. "~2 min". */
  minutes: string;
  /** How players interact — drives the "Turns" / "Together" badge. */
  pace: GamePace;
  /** Minimum players needed to start. Defaults to 2. */
  minPlayers?: number;
  /** Maximum players the game itself supports (arcade caps rooms at 8). Defaults to 2. */
  maxPlayers?: number;
  /** A CSS color used to accent the game's card and player identity. */
  accent?: string;
  /** Audience this game is designed for. Drives the category filter in the game picker. */
  category?: GameCategory;
  /** The game surface. Rendered only when the room is connected. */
  Component: ComponentType;
}> {}

/** Player-count bounds for a game, applying the 2-player defaults. */
export function gameCapacity(game: GameDef): GameCapacity {
  return {
    min: game.minPlayers ?? DEFAULT_GAME_CAPACITY.min,
    max: game.maxPlayers ?? DEFAULT_GAME_CAPACITY.max,
  };
}
