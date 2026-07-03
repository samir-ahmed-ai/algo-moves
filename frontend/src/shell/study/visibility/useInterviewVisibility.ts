import { useMemo } from 'react';
import { useCanvasCollabOptional } from '@/shell/canvas/collab/CanvasCollabProvider';
import type { SessionRole } from '@/lib/session';

/** Reference panel kinds hidden from interview candidates. */
const CANDIDATE_HIDDEN_PANELS = new Set([
  'hints',
  'pattern',
  'glossary',
  'cheat',
  'source',
  'copy',
]);

export type InterviewVisibility = 'visible' | 'hidden';

/**
 * Gate panel visibility during interview sessions. Returns `'hidden'` for
 * reference panels when the local peer is a guest in an interview room.
 */
export function interviewPanelVisibility(
  panelKind: string,
  sessionKind: 'solo' | 'collab' | 'interview',
  role: SessionRole | 'player' | null,
): InterviewVisibility {
  if (sessionKind !== 'interview') return 'visible';
  const isCandidate = role === 'guest' || role === 'player';
  if (!isCandidate) return 'visible';
  return CANDIDATE_HIDDEN_PANELS.has(panelKind) ? 'hidden' : 'visible';
}

export function useInterviewVisibility(panelKind: string): InterviewVisibility {
  const collab = useCanvasCollabOptional();
  return useMemo(() => {
    const session = collab?.session ?? { kind: 'solo' as const };
    const role = collab?.role ?? null;
    return interviewPanelVisibility(panelKind, session.kind, role);
  }, [collab?.session, collab?.role, panelKind]);
}
