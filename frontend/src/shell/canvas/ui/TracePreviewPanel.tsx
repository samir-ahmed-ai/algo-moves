import { useEffect, useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { COPY_FEEDBACK_MS } from '../../copyFeedback';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../../chromeUi';
import { useWorkspace } from '@/store/workspace';
import { useCanvasFrame } from '../CanvasContext';
import { useReplayStoreOptional } from '@/store/replay';
import { generateTrace } from '@/lib/canvas';
import { Label } from './nodeui';

/** Global trace panel — full generated move trace (Strudel PatternPanel). */
export function TracePreviewPanel() {
  const { tracePreviewOpen, setTracePreviewOpen } = useWorkspace();
  const { frames, player } = useCanvasFrame();
  const replay = useReplayStoreOptional();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!tracePreviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTracePreviewOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tracePreviewOpen, setTracePreviewOpen]);

  if (!tracePreviewOpen) return null;

  const traceText = replay?.trace || generateTrace(frames);
  const header = `Generated trace · step ${player.index + 1}/${frames.length}`;

  const copy = () => {
    navigator.clipboard?.writeText(traceText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-12 z-40 flex justify-end px-3 pb-1.5">
      <div className="pointer-events-auto w-[min(50vw,560px)] overflow-hidden rounded-lg border border-edge bg-panel/95 shadow-[var(--shadow-xl)] backdrop-blur">
        <header className="flex items-center gap-1.5 border-b border-edge px-2 py-1">
          <Label className="flex-1 truncate">{header}</Label>
          <button
            type="button"
            onClick={copy}
            title="Copy trace"
            className="grid h-5 w-5 place-items-center rounded-md text-ink3 hover:bg-panel2 hover:text-ink"
          >
            {copied ? <Check className="h-3 w-3 text-good" /> : <Copy className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={() => setTracePreviewOpen(false)}
            className="grid h-5 w-5 place-items-center rounded-md text-ink3 hover:bg-panel2 hover:text-ink"
            aria-label="Close trace preview"
          >
            <X className="h-3 w-3" />
          </button>
        </header>
        <pre className={cn('ws-scroll max-h-[240px] overflow-auto p-2 font-mono leading-relaxed text-ink2', chromeText.sm)}>
          {traceText}
        </pre>
      </div>
    </div>
  );
}
