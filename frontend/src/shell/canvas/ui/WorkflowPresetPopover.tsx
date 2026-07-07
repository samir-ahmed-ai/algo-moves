import { useState } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../../chromeUi';
import { WORKFLOW_PRESET_ACTIONS, type WorkflowPresetAction } from '../../../data/workflowPresets';

export function WorkflowPresetPopover({
  onApply,
  dense,
}: {
  onApply: (preset: WorkflowPresetAction) => void;
  dense?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);

  const apply = (preset: WorkflowPresetAction) => {
    onApply(preset);
    setApplied(preset.id);
    setOpen(false);
  };

  return (
    <div className="workflow-preset relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Workflow presets"
        className="project-action-btn workflow-preset__trigger flex items-center gap-1 rounded-md border border-edge px-2 py-1 text-ink2 hover:bg-panel2"
      >
        <LayoutTemplate className="h-3.5 w-3.5" />
        {!dense && <span className={chromeText.sm}>Workflows</span>}
      </button>
      {open && (
        <div className="project-popover workflow-preset__panel absolute right-0 top-full z-50 mt-1 w-[min(90vw,16rem)] rounded-lg border border-edge bg-panel p-2 shadow-theme-lg">
          <h4 className={cn('mb-1 font-semibold text-ink', chromeText.sm)}>Workflow presets</h4>
          {WORKFLOW_PRESET_ACTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => apply(p)}
              className={cn(
                'workflow-preset__item mb-1 w-full rounded border border-edge px-2 py-1.5 text-left hover:bg-panel2',
                applied === p.id && 'workflow-preset__item--active border-accent',
              )}
            >
              <div className={chromeText.sm}>{p.label}</div>
              <div className={cn('text-ink3', chromeText.xs)}>{p.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
