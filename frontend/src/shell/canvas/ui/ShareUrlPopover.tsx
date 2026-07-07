import { useRef, useState } from 'react';
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
  usePopoverDismiss(ref, open, () => setOpen(false));

  if (!state) return null;

  const url = getProjectShareUrl(state);
  const kb = Math.round(new Blob([url]).size / 1024);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Share canvas URL"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1 rounded-md border border-edge text-ink2 hover:bg-panel2',
          dense ? 'h-7 w-7 justify-center px-0 py-0' : 'px-2 py-1',
        )}
      >
        <Link className="h-3.5 w-3.5" />
        {!dense && <span className={chromeText.sm}>Share</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[min(90vw,16rem)] rounded-lg border border-edge bg-panel p-2 shadow-theme-lg">
          <p className={cn('mb-1 text-ink3', chromeText.xs)}>~{kb}KB state URL</p>
          <input
            readOnly
            value={url}
            className="mb-1.5 w-full truncate rounded border border-edge bg-panel2 px-1.5 py-0.5 font-mono text-[length:var(--fs-2xs)]"
          />
          <button
            type="button"
            onClick={() => void copy(url)}
            className={cn(
              'flex w-full items-center justify-center gap-1 rounded border border-edge py-1 hover:bg-panel2',
              chromeText.sm,
            )}
          >
            {copied ? <Check className="h-3 w-3 text-good" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}
