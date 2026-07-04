import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../../../chromeUi';
import { RADIUS_CTRL } from '../../ui/nodeui';
import { useCanvasCollab } from '../CanvasCollabProvider';
import { PresenceBar } from './PresenceBar';
import { TimerWidget } from './TimerWidget';

/**
 * Floating interview facilitation bar: presence roster + shared timer, with a
 * "view only" strip for locked-out guests. Only mounts during an interview
 * session; inert otherwise.
 */
export function InterviewHud() {
  const { isCollaborating, session, isHost } = useCanvasCollab();
  if (!isCollaborating || session.kind !== 'interview') return null;

  const locked = session.interviewRuntime?.locked && !isHost;

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5">
      <div className="pointer-events-auto flex items-center gap-2">
        <PresenceBar />
        <TimerWidget />
      </div>
      {locked ? (
        <span
          className={cn(
            'pointer-events-none inline-flex items-center gap-1.5 border border-amber-500/50 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-500',
            RADIUS_CTRL,
            chromeText.xs,
          )}
        >
          <Lock className="h-3 w-3" />
          View only — the interviewer locked the board
        </span>
      ) : null}
    </div>
  );
}
