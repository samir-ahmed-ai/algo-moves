import { useMemo } from 'react';
import { useWorkspace } from '@/store/workspace';
import { buildInterviewInviteUrl } from '@/store/navigation/shareState';
import { useCanvasCollab } from '@/shell/collab/CanvasCollabProvider';

/** Guest-invite URL for the live interview room ('' until a session exists). */
export function useInterviewInviteUrl(): string {
  const { room, session } = useCanvasCollab();
  const { activeItemId, mode, theme, palette, themePreset, dir } = useWorkspace();

  return useMemo(() => {
    if (!room || session.kind !== 'interview') return '';
    const problemId = session.activeProblemId || undefined;
    return buildInterviewInviteUrl(
      {
        item: problemId ?? activeItemId,
        focus: problemId ? 'problem' : 'canvas',
        mode,
        theme,
        palette,
        themePreset,
        dir,
        sessionKind: 'interview',
      },
      room,
      session.guestToken,
    );
  }, [room, session, activeItemId, mode, theme, palette, themePreset, dir]);
}
