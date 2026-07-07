import { useState } from 'react';
import { Sparkles, Check, LayoutGrid, Eye, Minimize2, Monitor, Presentation } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../../chromeUi';
import { nodeText } from './nodeui';
import { LAYOUT_PRESET_META, type LayoutPreset } from '../layout/layout';

const PRESET_ICONS: Record<LayoutPreset, React.ReactNode> = {
  Full: <LayoutGrid className="h-4 w-4" />,
  TraceFocus: <Eye className="h-4 w-4" />,
  Minimal: <Minimize2 className="h-4 w-4" />,
  Theater: <Monitor className="h-4 w-4" />,
  Demo: <Presentation className="h-4 w-4" />,
};

export function PresetPopover({
  onApply,
  triggerClassName,
  dense,
}: {
  onApply: (preset: LayoutPreset) => void;
  triggerClassName?: string;
  dense?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);

  const apply = (preset: LayoutPreset) => {
    onApply(preset);
    setApplied(preset);
    setTimeout(() => setApplied(null), 1800);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Layout presets"
        className={cn(
          dense
            ? 'flex w-full items-center gap-1.5 rounded-md border border-edge bg-panel2 px-1.5 py-1 text-left text-ink2 transition-colors hover:border-accent hover:text-accent'
            : 'grid h-5 w-5 place-items-center rounded-md border border-edge bg-panel2 text-ink2 transition-colors hover:border-accent hover:text-accent',
          triggerClassName,
        )}
      >
        <Sparkles className={dense ? 'h-3 w-3 shrink-0' : 'h-3 w-3'} />
        {dense && <span className="min-w-0 flex-1 truncate">Layout preset</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(90vw,18rem)] rounded-lg border border-edge bg-panel p-2 shadow-[var(--shadow-xl)]">
            <h4 className={cn('mb-0.5 font-semibold text-ink', chromeText.sm)}>Layout presets</h4>
            <p className={cn('mb-2 text-ink3', chromeText.sm)}>
              One-click canvas arrangements for different workflows.
            </p>
            <div className="flex flex-col gap-1.5">
              {(Object.keys(LAYOUT_PRESET_META) as LayoutPreset[]).map((id) => {
                const p = LAYOUT_PRESET_META[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => apply(id)}
                    className="flex items-start gap-1.5 rounded-md border border-edge p-1.5 text-left transition-colors hover:border-accent/50 hover:bg-panel2"
                  >
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-panel2 text-accent">
                      {PRESET_ICONS[id]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block font-medium text-ink', chromeText.base)}>
                        {p.label}
                      </span>
                      <span className={cn('block text-ink3', chromeText.sm)}>{p.description}</span>
                      <span
                        className={cn('mt-1 block font-mono tracking-tight text-ink3', nodeText.xs)}
                      >
                        {p.sketch}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {applied && (
              <div
                className={cn(
                  'mt-2 flex items-center gap-1.5 rounded-md bg-accentbg px-2 py-1.5 text-accent',
                  chromeText.sm,
                )}
              >
                <Check className="h-3.5 w-3.5" />
                Applied {applied}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
