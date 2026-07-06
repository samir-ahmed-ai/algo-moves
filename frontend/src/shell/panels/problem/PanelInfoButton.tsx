import { useRef, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { nodeText } from '@/shell/canvas';
import { usePopoverDismiss } from '@/shell/ui/usePopoverDismiss';

export function PanelInfoButton({
  label,
  title,
  children,
  className,
}: {
  label: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  usePopoverDismiss(rootRef, open, () => setOpen(false));

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'grid h-6 w-6 place-items-center rounded-full border border-edge bg-panel2 text-ink3 transition-colors hover:border-accent/40 hover:text-accent',
          open && 'border-accent/50 bg-accentbg text-accent',
        )}
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={title}
          className="absolute left-0 top-full z-30 mt-1.5 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-edge bg-panel p-3 shadow-lg"
        >
          <p className={cn('font-semibold text-ink', nodeText.sm)}>{title}</p>
          <div className="mt-2 space-y-2">{children}</div>
        </div>
      )}
    </div>
  );
}

export function InfoParagraphs({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <p key={line} className={cn('leading-relaxed text-ink2', nodeText.sm)}>
          {line}
        </p>
      ))}
    </>
  );
}

export function InfoCases({ cases }: { cases: { label: string; input: string; output?: string; note?: string }[] }) {
  if (cases.length === 0) return null;
  return (
    <div className="space-y-2 border-t border-edge pt-2">
      <p className={cn('font-medium uppercase tracking-wide text-ink3', nodeText.xs)}>Examples</p>
      {cases.map((c) => (
        <div key={c.label} className="rounded-md border border-edge/60 bg-panel2/40 px-2 py-1.5">
          <p className={cn('font-medium text-ink', nodeText.xs)}>{c.label}</p>
          <p className={cn('mt-0.5 font-mono text-ink2', nodeText.xs)}>{c.input}</p>
          {c.output && (
            <p className={cn('mt-0.5 text-ink2', nodeText.xs)}>
              Expected: <span className="font-mono text-ink">{c.output}</span>
            </p>
          )}
          {c.note && <p className={cn('mt-1 leading-relaxed text-ink3', nodeText.xs)}>{c.note}</p>}
        </div>
      ))}
    </div>
  );
}
