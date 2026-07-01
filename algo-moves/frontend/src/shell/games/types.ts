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
  /** How the two players interact — drives the "Turns" / "Together" badge. */
  pace: 'turns' | 'simultaneous';
  /** The game surface. Rendered only when the room is connected. */
  Component: ComponentType;
}
