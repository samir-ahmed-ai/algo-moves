import { useId, useRef, useState } from 'react';
import { Copy, Check, Link } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../../chromeUi';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { getProjectShareUrl, type ProjectState } from '@/store/project-state';
import { usePopoverDismiss } from '../../ui/usePopoverDismiss';

export function ShareUrlPopover({ state, dense }: { state: ProjectState | null; dense?: boolean }) {
  const [open, setOpen] = useState(false);
  const { copied, copy } = useCopyFeedback();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const inputId = useId();
  usePopoverDismiss(ref, open, () => setOpen(false));

  if (!state) return null;

  const url = getProjectShareUrl(state);
  const kb = Math.round(new Blob([url]).size / 1024);

  return (
    <div ref={ref} className="project-share relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Share canvas URL"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'project-action-btn project-share__trigger flex items-center gap-1 rounded-full border border-edge bg-[var(--surface-glass)] text-ink2 shadow-theme-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-panel2 hover:text-ink hover:shadow-theme-md',
          dense ? 'h-7 w-7 justify-center px-0 py-0' : 'px-2 py-1',
        )}
      >
        <Link className="h-3.5 w-3.5" />
        {!dense && <span className={chromeText.sm}>Share</span>}
      </button>
      {open && (
        <div
          className="project-popover project-share__panel absolute right-0 top-full z-50 mt-1.5 w-[min(90vw,18rem)] overflow-hidden rounded-2xl border border-edge bg-[var(--surface-glass)] shadow-theme-xl ring-1 ring-accent/10 backdrop-blur-xl"
          role="dialog"
          aria-labelledby={titleId}
        >
          <div className="border-b border-edge bg-panel/40 px-3 py-2">
            <h2 id={titleId} className={cn('font-semibold text-ink', chromeText.sm)}>
              Share canvas
            </h2>
            <p className={cn('text-ink3', chromeText.xs)}>~{kb}KB state URL</p>
          </div>
          <div className="p-3">
            <label htmlFor={inputId} className="sr-only">
              Share URL
            </label>
            <input
              id={inputId}
              readOnly
              value={url}
              className="project-share__input mb-2 w-full truncate rounded-xl border border-edge bg-panel2 px-2 py-1 font-mono text-[length:var(--fs-2xs)] text-ink outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => void copy(url)}
              className={cn(
                'project-share__copy flex w-full items-center justify-center gap-1 rounded-full border border-edge bg-panel/70 py-1.5 shadow-theme-sm transition hover:-translate-y-0.5 hover:bg-panel2 hover:shadow-theme-md',
                copied ? 'text-good' : 'text-ink2',
                chromeText.sm,
              )}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
