import { useId } from 'react';
import { Keyboard, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../chromeUi';

export const WORKSPACE_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['←', '→'], label: 'Step back / forward' },
  { keys: ['[', ']'], label: 'Previous / next problem' },
  { keys: ['Space'], label: 'Play / pause' },
  { keys: ['Home', 'End'], label: 'Jump to first / last frame' },
  { keys: ['C'], label: 'Focus canvas (collapse chrome)' },
  { keys: ['F'], label: 'Presentation mode' },
  { keys: ['?'], label: 'Toggle this help' },
  { keys: ['⌘', 'K'], label: 'Command palette' },
  { keys: ['Shift', 'drag'], label: 'Box-select panels' },
  { keys: ['Delete'], label: 'Remove selected panels' },
  { keys: ['Esc'], label: 'Close overlay / exit presentation' },
];

export const RECALL_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘', '\\'], label: 'Toggle blind recall' },
  { keys: ['⌘', '⇧', 'R'], label: 'Clear attempt' },
  { keys: ['⌘', '.'], label: 'Toggle line / diff pointer' },
  { keys: ['⌘', '⇧', '.'], label: 'Cycle reveal ahead (full/dim/blur/hidden)' },
  { keys: ['⌘', '⇧', '−'], label: 'Decrease editor font size' },
  { keys: ['⌘', '⇧', '+'], label: 'Increase editor font size' },
];

export function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const titleId = useId();

  return (
    <div
      className="shortcuts-overlay absolute inset-0 z-50 grid place-items-center bg-bg/70 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="true"
    >
      <div
        className="shortcuts-overlay__card max-h-[min(82vh,44rem)] w-[420px] max-w-[92vw] overflow-hidden rounded-3xl border border-edge bg-[var(--surface-glass)] shadow-theme-xl ring-1 ring-accent/10 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcuts-overlay__header flex items-center justify-between border-b border-edge bg-panel/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-accent text-[var(--accent-contrast)] shadow-theme-sm">
              <Keyboard className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className={cn('font-semibold text-ink', chromeText.base)}>
                Keyboard shortcuts
              </h2>
              <p className={cn('truncate text-ink3', chromeText.xs)}>
                Move faster through the workspace.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shortcuts-overlay__close grid h-8 w-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
            aria-label="Close keyboard shortcuts"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="ws-scroll max-h-[calc(min(82vh,44rem)-4.5rem)] overflow-auto p-3">
          <ShortcutSection title="Workspace" shortcuts={WORKSPACE_SHORTCUTS} />
          <div className="shortcuts-overlay__divider my-3 border-t border-edge/60" />
          <ShortcutSection title="Recall editor" shortcuts={RECALL_SHORTCUTS} />
        </div>
      </div>
    </div>
  );
}

function ShortcutSection({
  title,
  shortcuts,
}: {
  title: string;
  shortcuts: { keys: string[]; label: string }[];
}) {
  return (
    <section aria-label={title}>
      <p className={cn('mb-2 font-semibold uppercase tracking-[0.14em] text-ink3', chromeText.xs)}>
        {title}
      </p>
      <div className="shortcuts-overlay__list flex flex-col gap-1">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.label}
            className="shortcuts-overlay__row flex items-center justify-between gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-panel/60"
          >
            <span className={cn(chromeText.tight, 'text-ink2')}>{shortcut.label}</span>
            <span className="shortcuts-overlay__keys flex shrink-0 gap-0.5">
              {shortcut.keys.map((key) => (
                <kbd
                  key={key}
                  className={cn(
                    'shortcuts-overlay__kbd rounded-lg border border-edge bg-panel2 px-1.5 py-0.5 font-mono text-ink shadow-theme-sm',
                    chromeText.sm,
                  )}
                >
                  {key}
                </kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
