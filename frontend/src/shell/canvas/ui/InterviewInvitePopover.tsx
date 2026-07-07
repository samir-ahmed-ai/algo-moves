import { useEffect, useState } from 'react';
import { Check, Copy, QrCode, UserCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils/cn';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { chromeText } from '../../chromeUi';
import { RADIUS_CTRL, RADIUS_SHELL } from '../ui/nodeui';
import { useCanvasCollab } from '@/shell/collab';
import { useInterviewInviteUrl } from '@/shell/interview/useInterviewInviteUrl';

/** Compact invite controls for the canvas toolbar during interview sessions. */
export function InterviewInvitePopover({
  btnClass,
  autoOpen = false,
  onAutoOpenHandled,
}: {
  btnClass: string;
  /** Open the panel as soon as the interview session is live (post-start CTA). */
  autoOpen?: boolean;
  onAutoOpenHandled?: () => void;
}) {
  const { room, session, isCollaborating } = useCanvasCollab();
  const [open, setOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const { copied, copy } = useCopyFeedback();
  const inviteUrl = useInterviewInviteUrl();

  const isInterview = isCollaborating && session.kind === 'interview' && !!room;

  useEffect(() => {
    if (!autoOpen || !isInterview) return;
    setOpen(true);
    onAutoOpenHandled?.();
  }, [autoOpen, isInterview, onAutoOpenHandled]);

  if (!isInterview) return null;

  return (
    <div className="interview-invite relative">
      <button
        type="button"
        title="Interview invite"
        aria-label="Interview invite"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(btnClass, open && 'canvas-toolbar__button--active bg-accentbg text-accent')}
      >
        <UserCheck className="h-4 w-4" />
      </button>
      {open && (
        <div
          className={cn(
            'interview-invite__panel project-popover absolute right-0 top-full z-20 mt-1 w-72 border border-edge bg-panel p-2 shadow-[var(--shadow-lg)]',
            RADIUS_SHELL,
          )}
        >
          <div className="interview-invite__head mb-1.5 flex items-center justify-between gap-2">
            <p className={cn('interview-invite__title font-medium text-ink2', chromeText.sm)}>
              Invite candidate
            </p>
            <span
              dir="ltr"
              title="Room code"
              className={cn(
                'interview-invite__room-code shrink-0 font-mono font-semibold tracking-[0.15em] text-accent',
                chromeText.xs,
              )}
            >
              {room}
            </span>
          </div>
          <div className="interview-invite__url-row mb-1.5 flex items-center gap-1">
            <input
              readOnly
              dir="ltr"
              value={inviteUrl}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Interview invite link"
              className={cn(
                'interview-invite__url min-w-0 flex-1 border border-edge bg-panel2 px-2 py-1 text-ink3 outline-none focus:border-accent',
                RADIUS_CTRL,
                chromeText.xs,
              )}
            />
            <button
              type="button"
              title="Copy invite link"
              aria-label="Copy invite link"
              onClick={() => void copy(inviteUrl)}
              className={cn(
                'interview-invite__copy grid h-7 w-7 shrink-0 place-items-center border border-edge bg-panel2 text-ink2 hover:text-ink',
                RADIUS_CTRL,
              )}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-good" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              title="Show QR"
              aria-label="Show QR code"
              aria-pressed={showQr}
              onClick={() => setShowQr((v) => !v)}
              className={cn(
                'interview-invite__qr-toggle grid h-7 w-7 shrink-0 place-items-center border border-edge bg-panel2 text-ink3 hover:text-ink',
                RADIUS_CTRL,
                showQr && 'text-accent',
              )}
            >
              <QrCode className="h-3.5 w-3.5" />
            </button>
          </div>
          {session.guestToken ? (
            <p className={cn('interview-invite__hint mb-1 text-ink3', chromeText.xs)}>
              Guest link enabled — the URL carries a secure join token, no room code needed.
            </p>
          ) : (
            <p className={cn('interview-invite__warning mb-1 text-amber-600', chromeText.xs)}>
              Cloud persistence off — guests can join with the room code only.
            </p>
          )}
          {showQr && inviteUrl ? (
            <div className="interview-invite__qr flex flex-col items-center gap-1 border-t border-edge pt-2">
              <QRCodeSVG
                value={inviteUrl}
                size={112}
                bgColor="transparent"
                fgColor="currentColor"
                className="text-ink"
              />
              <span className={cn('text-ink3', chromeText.xs)}>Scan to join</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void copy(inviteUrl)}
              className={cn(
                'interview-invite__copy-full flex w-full items-center justify-center gap-1 border border-edge bg-panel2 px-2 py-1 text-ink2 hover:text-ink',
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
