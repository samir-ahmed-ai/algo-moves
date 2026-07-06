import type { ComponentType } from 'react';

/**
 * A two-player game plugged into the arcade. Each game lives in its own nested
 * folder under `games/games/<id>/` and default-exports a `GameDef`. The registry
 * collects them; the page renders `Component` inside a shared shell once both
 * players are connected. Games talk to each other with {@link useGameChannel},
 * maintaining their own local state and applying the peer's relayed moves.
 */
export interface GameDef {
  /** Stable id, also used in the shared room state and analytics. */
  id: string;
  title: string;
  /** One-line hook shown on the picker card. */
  tagline: string;
  /** Inner-SVG mnemonic markup (viewBox 0 0 48 48), same house style as problem glyphs. */
  glyph: string;
  /** Rough session length, e.g. "~2 min". */
  minutes: string;
  /** How players interact — drives the "Turns" / "Together" badge. */
  pace: 'turns' | 'simultaneous';
  /** Minimum players needed to start. Defaults to 2. */
  minPlayers?: number;
  /** Maximum players the game itself supports (arcade caps rooms at 8). Defaults to 2. */
  maxPlayers?: number;
  /** A CSS color used to accent the game's card and player identity. */
  accent?: string;
  /** Audience this game is designed for. Drives the category filter in the game picker. */
  category?: 'couple' | 'party';
  /** The game surface. Rendered only when the room is connected. */
  Component: ComponentType;
}

/** Player-count bounds for a game, applying the 2-player defaults. */
export function gameCapacity(game: GameDef): { min: number; max: number } {
  return { min: game.minPlayers ?? 2, max: game.maxPlayers ?? 2 };
}
