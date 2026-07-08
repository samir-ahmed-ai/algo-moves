import { useEffect, useRef, useState } from 'react';
import {
  Check,
  CloudOff,
  Code2,
  Columns2,
  Copy,
  LayoutDashboard,
  Lock,
  LockOpen,
  LogOut,
  Navigation,
  PenLine,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { useWorkspace, type CanvasFillPreset } from '@/store/workspace';
import { RADIUS_CTRL, RADIUS_SHELL } from '@/shell/canvas/ui/nodeui';
import { useCanvasCollab } from '@/shell/collab/CanvasCollabProvider';
import { usePopoverDismiss } from '@/shell/ui/usePopoverDismiss';
import { PresenceBar } from './PresenceBar';
import { TimerWidget } from './TimerWidget';
import { useInterviewInviteUrl } from './useInterviewInviteUrl';
import { copyTextToClipboard, endInterview } from './interviewControls';

const LAYOUT_PRESETS: {
  preset: CanvasFillPreset;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    preset: 'auto',
    label: 'Auto fill',
    hint: 'Tile every panel to fill the canvas',
    icon: <LayoutDashboard className="h-3.5 w-3.5" />,
  },
  {
    preset: 'board',
    label: 'Board focus',
    hint: 'Whiteboard front and centre',
    icon: <PenLine className="h-3.5 w-3.5" />,
  },
  {
    preset: 'code',
    label: 'Code focus',
    hint: 'Editor front and centre',
    icon: <Code2 className="h-3.5 w-3.5" />,
  },
  {
    preset: 'split',
    label: 'Split 50/50',
    hint: 'Even columns',
    icon: <Columns2 className="h-3.5 w-3.5" />,
  },
];

/** Host-only canvas layout presets: one click re-tiles the board to fill the view. */
function LayoutPresetsButton() {
  const { canvasHud } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  usePopoverDismiss(ref, open, () => setOpen(false));
  if (!canvasHud) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="Board layout — tile panels to fill the canvas"
        aria-label="Board layout"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(HUD_BTN, open && 'interview-hud__btn--active bg-accentbg text-accent')}
      >
        <LayoutDashboard className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          className={cn(
            'interview-hud__layouts absolute left-1/2 top-full z-30 mt-1.5 w-52 -translate-x-1/2 border border-edge bg-panel p-1 shadow-[var(--shadow-lg)]',
            RADIUS_SHELL,
          )}
        >
          {LAYOUT_PRESETS.map((p) => (
            <button
              key={p.preset}
              type="button"
              onClick={() => {
                canvasHud.onFillCanvas(p.preset);
                setOpen(false);
              }}
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-panel2"
            >
              <span className="mt-0.5 shrink-0 text-ink3">{p.icon}</span>
              <span className="min-w-0">
                <span className={cn('block font-medium text-ink', chromeText.sm)}>{p.label}</span>
                <span className={cn('block text-ink3', chromeText.xs)}>{p.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const HUD_BTN =
  'interview-hud__btn grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink3 transition-colors hover:bg-panel2 hover:text-ink';

/**
 * Top-center interview session bar: room code (host: click = copy invite),
 * presence roster, shared timer, and host facilitation controls (lock, follow
 * me, end). Candidates get the countdown, a "following" chip and a "view only"
 * strip while locked. Only mounts during a live interview session.
 */
export function InterviewHud() {
  const { isCollaborating, session } = useCanvasCollab();
  if (!isCollaborating || session.kind !== 'interview') return null;
  return <InterviewHudBar />;
}

function InterviewHudBar() {
  const { session, isHost, room, backendDegraded, setLocked, setHostFollow, leaveSession } =
    useCanvasCollab();
  const inviteUrl = useInterviewInviteUrl();
  const [copied, setCopied] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!confirmEnd) return undefined;
    const t = window.setTimeout(() => setConfirmEnd(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirmEnd]);

  const runtime = session.interviewRuntime;
  const locked = !!runtime?.locked;
  const following = !!runtime?.hostFollow;
  const lockedOut = locked && !isHost;

  const copyInvite = async () => {
    if (!inviteUrl) return;
    if (!(await copyTextToClipboard(inviteUrl))) return;
    setCopied(true);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const onEnd = () => {
    if (!confirmEnd) {
      setConfirmEnd(true);
      return;
    }
    setConfirmEnd(false);
    endInterview({ session, setLocked, leaveSession });
  };

  return (
    <div className="interview-hud pointer-events-none absolute left-1/2 top-3 z-30 flex w-max max-w-[min(92vw,680px)] -translate-x-1/2 flex-col items-center gap-1.5">
      <div
        className={cn(
          'interview-hud__bar pointer-events-auto flex items-center gap-1 border border-edge bg-panel/95 p-1 shadow-[var(--shadow-lg)] backdrop-blur',
          RADIUS_SHELL,
        )}
      >
        {isHost ? (
          <button
            type="button"
            title={copied ? 'Invite link copied' : 'Copy invite link'}
            aria-label="Copy invite link"
            onClick={() => void copyInvite()}
            className={cn(
              'interview-hud__room flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 font-mono font-semibold tracking-[0.15em] text-accent transition-colors hover:bg-accentbg',
              chromeText.sm,
            )}
          >
            <span dir="ltr">{room}</span>
            {copied ? (
              <Check className="h-3 w-3 text-good" />
            ) : (
              <Copy className="h-3 w-3 text-ink3" />
            )}
          </button>
        ) : (
          <span
            dir="ltr"
            title="Room code"
            className={cn(
              'interview-hud__room flex h-7 shrink-0 items-center rounded-md px-2 font-mono font-semibold tracking-[0.15em] text-accent',
              chromeText.sm,
            )}
          >
            {room}
          </span>
        )}

        <span className="interview-hud__divider h-5 w-px shrink-0 bg-edge" aria-hidden />
        <PresenceBar />
        <TimerWidget />

        {isHost ? (
          <>
            <span className="interview-hud__divider h-5 w-px shrink-0 bg-edge" aria-hidden />
            <LayoutPresetsButton />
            <button
              type="button"
              title={locked ? 'Unlock board' : 'Lock board — candidate becomes view-only'}
              aria-label={locked ? 'Unlock board' : 'Lock board'}
              aria-pressed={locked}
              onClick={() => setLocked(!locked)}
              className={cn(
                HUD_BTN,
                locked &&
                  'interview-hud__btn--active bg-amber-500/15 text-amber-500 hover:bg-amber-500/20 hover:text-amber-500',
              )}
            >
              {locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              title={following ? 'Stop follow me' : 'Follow me — candidate mirrors your viewport'}
              aria-label={following ? 'Stop follow me' : 'Follow me'}
              aria-pressed={following}
              onClick={() => setHostFollow(!following)}
              className={cn(
                HUD_BTN,
                following &&
                  'interview-hud__btn--active bg-accentbg text-accent hover:bg-accentbg hover:text-accent',
              )}
            >
              <Navigation className="h-3.5 w-3.5" />
            </button>
            {backendDegraded ? (
              <span
                title="Cloud persistence unavailable — questions, notes and rubric won't be saved"
                className={cn(
                  'interview-hud__degraded inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-amber-500/10 px-2 font-medium text-amber-500',
                  chromeText.xs,
                )}
              >
                <CloudOff className="h-3 w-3" />
                <span className="hidden md:inline">Offline</span>
              </span>
            ) : null}
            <span className="interview-hud__divider h-5 w-px shrink-0 bg-edge" aria-hidden />
            <button
              type="button"
              title={confirmEnd ? 'Click again to end the interview' : 'End interview'}
              aria-label="End interview"
              onClick={onEnd}
              className={cn(
                'interview-hud__end inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 font-medium transition-colors',
                RADIUS_CTRL,
                chromeText.xs,
                confirmEnd ? 'bg-bad text-white' : 'text-bad hover:bg-badbg',
              )}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{confirmEnd ? 'Confirm end' : 'End'}</span>
            </button>
          </>
        ) : following ? (
          <span
            className={cn(
              'interview-hud__following inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-accentbg px-2 font-medium text-accent',
              chromeText.xs,
            )}
          >
            <Navigation className="h-3 w-3" />
            <span className="hidden sm:inline">Following interviewer</span>
          </span>
        ) : null}
      </div>

      {lockedOut ? (
        <span
          className={cn(
            'pointer-events-none inline-flex items-center gap-1.5 border border-amber-500/50 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-500',
            'interview-hud__locked',
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
