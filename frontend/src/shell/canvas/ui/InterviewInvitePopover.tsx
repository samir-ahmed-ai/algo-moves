import { useMemo, useState } from 'react';
import { Check, Copy, Link2, QrCode, UserCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import { buildInterviewInviteUrl } from '@/store/navigation/shareState';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { chromeText } from '../../chromeUi';
import { RADIUS_CTRL, RADIUS_SHELL } from '../ui/nodeui';
import { useCanvasCollab } from '../collab/CanvasCollabProvider';

/** Compact invite controls for the canvas toolbar during interview sessions. */
export function InterviewInvitePopover({ btnClass }: { btnClass: string }) {
  const collab = useCanvasCollab();
  const { activeItemId, mode, theme, palette, themePreset, dir } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const { copied, copy } = useCopyFeedback();

  const { room, session, isCollaborating } = collab;
  const isInterview = isCollaborating && session.kind === 'interview' && !!room;

  const inviteUrl = useMemo(() => {
    if (!room) return '';
    return buildInterviewInviteUrl(
      {
        item: session.activeProblemId ?? activeItemId,
        focus: session.activeProblemId ? 'problem' : 'canvas',
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

  if (!isInterview) return null;

  return (
    <div className="relative">
      <button
        type="button"
        title="Interview invite"
        aria-label="Interview invite"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(btnClass, open && 'bg-accentbg text-accent')}
      >
        <UserCheck className="h-4 w-4" />
      </button>
      {open && (
        <div
          className={cn(
            'absolute right-0 top-full z-20 mt-1 w-64 border border-edge bg-panel p-2 shadow-[var(--shadow-lg)]',
            RADIUS_SHELL,
          )}
        >
          <p className={cn('mb-1.5 font-medium text-ink2', chromeText.sm)}>Invite candidate</p>
          <div className="mb-2 flex items-center gap-1">
            <span dir="ltr" className={cn('min-w-0 flex-1 truncate font-mono text-accent', chromeText.xs)}>
              {room}
            </span>
            <button
              type="button"
              title="Copy invite link"
              onClick={() => void copy(inviteUrl)}
              className={cn('inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 text-ink2 hover:text-ink', RADIUS_CTRL, chromeText.xs)}
            >
              {copied ? <Check className="h-3 w-3 text-good" /> : <Link2 className="h-3 w-3" />}
              {copied ? 'Copied' : 'Link'}
            </button>
            <button
              type="button"
              title="Show QR"
              onClick={() => setShowQr((v) => !v)}
              className={cn('grid h-6 w-6 place-items-center text-ink3 hover:text-ink', RADIUS_CTRL)}
            >
              <QrCode className="h-3 w-3" />
            </button>
          </div>
          {!session.guestToken ? (
            <p className={cn('mb-2 text-amber-600', chromeText.xs)}>
              Cloud persistence off — guests can join with the room code only.
            </p>
          ) : null}
          {showQr && inviteUrl ? (
            <div className="flex flex-col items-center gap-1 border-t border-edge pt-2">
              <QRCodeSVG value={inviteUrl} size={112} bgColor="transparent" fgColor="currentColor" className="text-ink" />
              <span className={cn('text-ink3', chromeText.xs)}>Scan to join</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void copy(inviteUrl)}
              className={cn(
                'flex w-full items-center justify-center gap-1 border border-edge bg-panel2 px-2 py-1 text-ink2 hover:text-ink',
                RADIUS_CTRL,
                chromeText.sm,
              )}
            >
              {copied ? <Check className="h-3 w-3 text-good" /> : <Copy className="h-3 w-3" />}
              Copy invite link
            </button>
          )}
        </div>
      )}
    </div>
  );
}
