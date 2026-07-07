import { Bug, Route, Zap } from 'lucide-react';
import type { AssembleGameDef } from './types';
import { hashString } from './gameShared';
import { SnapCallGame } from './SnapCallGame';
import { ImposterGame } from './ImposterGame';
import { OneStrokeGame } from './OneStrokeGame';

/**
 * The creative assemble trio — a learning ladder over the same pieces:
 * RECOGNIZE the order (Snap Call) → READ the details (Imposter) →
 * REPRODUCE the structure (One Stroke).
 */
export const ASSEMBLE_GAMES: AssembleGameDef[] = [
  {
    id: 'snap-call',
    name: 'Snap Call',
    tagline: 'Flick right if real, left if fake',
    icon: Zap,
    Component: SnapCallGame,
  },
  {
    id: 'imposter',
    name: 'Imposter',
    tagline: 'One block is lying. Find it.',
    icon: Bug,
    Component: ImposterGame,
  },
  {
    id: 'one-stroke',
    name: 'One Stroke',
    tagline: 'Trace the program in one swipe',
    icon: Route,
    Component: OneStrokeGame,
  },
];

/** Stable per-problem default so a topic run rotates through all three games. */
export function defaultGameFor(scope: string): AssembleGameDef {
  const game = ASSEMBLE_GAMES[hashString(scope) % ASSEMBLE_GAMES.length];
  if (!game) return ASSEMBLE_GAMES[0]!;
  return game;
}
