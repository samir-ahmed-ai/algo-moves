import { defaultSession, type SessionMeta } from './types';
import type { CanvasMode } from '@/core';

export interface SessionBridgeInput {
  mode: CanvasMode;
  problemFocused: boolean;
  /** When inside a collab room, prefer the room session metadata. */
  collabSession?: SessionMeta | null;
}

/** Map workspace navigation state to product session metadata. */
export function workspaceSessionMeta(input: SessionBridgeInput): SessionMeta {
  if (input.collabSession && input.collabSession.kind !== 'solo') {
    return input.collabSession;
  }
  if (input.mode === 'visualize' && !input.problemFocused) {
    return { kind: 'collab' };
  }
  return defaultSession('solo');
}
