import { useMemo } from 'react';
import type { SessionMeta } from '@/lib/session';
import { useWorkspace } from '@/store/workspace';
import { useCanvasCollabOptional } from '@/shell/canvas/collab/CanvasCollabProvider';
import { workspaceSessionMeta } from '@/lib/session';

/**
 * Merges workspace navigation with optional collab room session metadata.
 * Use inside the canvas collab tree for interview/collab-aware session kind.
 */
export function useWorkspaceSession(): SessionMeta {
  const { mode, problemFocused } = useWorkspace();
  const collab = useCanvasCollabOptional();
  return useMemo(
    () =>
      workspaceSessionMeta({
        mode,
        problemFocused,
        collabSession: collab?.session,
      }),
    [mode, problemFocused, collab?.session],
  );
}
