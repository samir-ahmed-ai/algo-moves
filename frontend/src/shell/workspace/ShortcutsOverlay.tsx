import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../chromeUi';

export const WORKSPACE_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['←', '→'], label: 'Step back / forward' },
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

export function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label="keyboard shortcuts"
      aria-modal="true"
    >
      <div
        className="w-[340px] max-w-[90vw] rounded-[var(--radius)] border border-edge bg-panel p-3 shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className={cn('font-semibold text-ink', chromeText.base)}>Keyboard shortcuts</span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-5 w-5 place-items-center rounded-md text-ink3 hover:bg-panel2 hover:text-ink"
            aria-label="close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {WORKSPACE_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.label} className="flex items-center justify-between gap-2">
              <span className={cn(chromeText.tight, 'text-ink2')}>{shortcut.label}</span>
              <span className="flex gap-0.5">
                {shortcut.keys.map((key) => (
                  <kbd key={key} className={cn('rounded border border-edge bg-panel2 px-1 py-px font-mono text-ink', chromeText.sm)}>
                    {key}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
