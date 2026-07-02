import { useState } from 'react';
import { Copy, Check, Link } from 'lucide-react';
import { COPY_FEEDBACK_MS } from '../copyFeedback';
import { cn } from '../../lib/cn';
import { chromeText } from '../chromeUi';
import { getProjectShareUrl, type ProjectState } from '../../lib/projectState';

export function ShareUrlPopover({
  state,
  dense,
}: {
  state: ProjectState | null;
  dense?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!state) return null;

  const url = getProjectShareUrl(state);
  const kb = Math.round(new Blob([url]).size / 1024);

  const copy = () => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Share canvas URL"
        className="flex items-center gap-1 rounded-md border border-edge px-2 py-1 text-ink2 hover:bg-panel2"
      >
        <Link className="h-3.5 w-3.5" />
        {!dense && <span className={chromeText.sm}>Share</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[min(90vw,18rem)] rounded-lg border border-edge bg-panel p-2 shadow-theme-lg">
          <p className={cn('mb-1 text-ink3', chromeText.xs)}>Full canvas state (~{kb}KB compressed)</p>
          <input readOnly value={url} className="mb-2 w-full truncate rounded border border-edge bg-panel2 px-2 py-1 font-mono text-[10px]" />
          <button type="button" onClick={copy} className="flex items-center gap-1 rounded border border-edge px-2 py-1 hover:bg-panel2">
            {copied ? <Check className="h-3 w-3 text-good" /> : <Copy className="h-3 w-3" />}
            <span className={chromeText.sm}>Copy link</span>
          </button>
        </div>
      )}
    </div>
  );
}
