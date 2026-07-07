import { useEffect, useMemo } from 'react';
import { useWorkspace, type CanvasInterviewControls } from '@/store/workspace';
import { useCanvasCollab } from '@/shell/collab/CanvasCollabProvider';
import { useInterviewInviteUrl } from './useInterviewInviteUrl';
import { copyTextToClipboard, endInterview, toggleSessionTimer } from './interviewControls';

/**
 * Publishes the interview session contract (start/invite/timer/lock/end) into
 * the workspace store while the canvas is mounted, so global chrome (command
 * palette, toolbar) can drive the session without reaching into the collab
 * tree. Renders nothing; unregisters on unmount.
 */
export function InterviewControlsBridge() {
  const collab = useCanvasCollab();
  const { setCanvasInterview, enterCollabCanvas } = useWorkspace();
  const inviteUrl = useInterviewInviteUrl();
  const {
    session,
    isHost,
    isCollaborating,
    startInterviewSession,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setLocked,
    leaveSession,
  } = collab;

  const hasSession = session.kind === 'interview';
  const sessionActive = hasSession && isCollaborating;
  const timerRunning = !!session.interviewRuntime?.timer.running;
  const locked = !!session.interviewRuntime?.locked;

  const controls = useMemo<CanvasInterviewControls>(
    () => ({
      hasSession,
      isHost,
      sessionActive,
      timerRunning,
      locked,
      start: () => {
        if (sessionActive) return;
        enterCollabCanvas();
        void startInterviewSession('');
      },
      copyInvite: async () => {
        if (!inviteUrl) {
          console.warn('[interview] No active interview session — nothing to copy.');
          return;
        }
        await copyTextToClipboard(inviteUrl);
      },
      toggleTimer: () => {
        toggleSessionTimer(session, { startTimer, pauseTimer, resumeTimer });
      },
      resetTimer,
      toggleLock: () => setLocked(!locked),
      end: () => endInterview({ session, setLocked, leaveSession }),
    }),
    [
      hasSession,
      isHost,
      sessionActive,
      timerRunning,
      locked,
      session,
      inviteUrl,
      enterCollabCanvas,
      startInterviewSession,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      setLocked,
      leaveSession,
    ],
  );

  useEffect(() => {
    setCanvasInterview(controls);
    return () => setCanvasInterview(null);
  }, [controls, setCanvasInterview]);

  return null;
}
