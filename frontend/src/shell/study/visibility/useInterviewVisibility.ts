import { useMemo } from 'react';
import type { InterviewSettings, SessionRole } from '@/lib/session';

import { useCanvasCollabOptional } from '@/shell/canvas';
/** Panels always hidden from candidates regardless of settings. */
const ALWAYS_HIDDEN = new Set(['source']);

/** Panels hidden when hideHints is enabled. */
const HINT_PANELS = new Set(['hints', 'pattern', 'glossary']);

/** Panels hidden when hideSolutions is enabled. */
const SOLUTION_PANELS = new Set(['copy', 'cheat', 'cheatsheet', 'complexity']);

export type InterviewVisibility = 'visible' | 'hidden';

/**
 * Gate panel visibility during interview sessions. Returns `'hidden'` for
 * reference panels when the local peer is a guest in an interview room,
 * respecting the host's `hideHints` and `hideSolutions` toggles.
 */
export function interviewPanelVisibility(
  panelKind: string,
  sessionKind: 'solo' | 'collab' | 'interview',
  role: SessionRole | 'player' | null,
  interview?: InterviewSettings,
): InterviewVisibility {
  if (sessionKind !== 'interview') return 'visible';
  const isCandidate = role === 'guest' || role === 'player';
  if (!isCandidate) return 'visible';

  if (ALWAYS_HIDDEN.has(panelKind)) return 'hidden';

  const hideHints = interview?.hideHints !== false;
  const hideSolutions = interview?.hideSolutions !== false;

  if (hideHints && HINT_PANELS.has(panelKind)) return 'hidden';
  if (hideSolutions && SOLUTION_PANELS.has(panelKind)) return 'hidden';

  return 'visible';
}

export function useInterviewVisibility(panelKind: string): InterviewVisibility {
  const collab = useCanvasCollabOptional();
  return useMemo(() => {
    const session = collab?.session ?? { kind: 'solo' as const };
    const role = collab?.role ?? null;
    return interviewPanelVisibility(panelKind, session.kind, role, session.interview);
  }, [collab?.session, collab?.role, panelKind]);
}
