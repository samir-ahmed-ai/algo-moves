import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useWorkspace } from '@/store/workspace';
import { setDojoMuted, useDojoMuted } from '../lib/audio';

/**
 * Floating top-left chrome for a dojo game page: back-to-hub, game identity,
 * live progress counter, and the shared mute toggle. Mount inside a
 * `relative` full-page container.
 */
export function DojoGameChrome({
  icon: Icon,
  title,
  completedCount,
  levelCount,
}: {
  icon: LucideIcon;
  title: string;
  completedCount: number;
  levelCount: number;
}) {
  const { enterDojo } = useWorkspace();
  const muted = useDojoMuted();

  return (
    <div className="vim-floating-chrome pointer-events-none absolute left-[var(--hpad)] top-[var(--pad)] z-10 flex items-center gap-[var(--gap)]">
      <button
        type="button"
        title="Back to Dojo Hub"
        onClick={() => enterDojo()}
        className="vim-floating-home pointer-events-auto grid h-[var(--row)] w-[var(--row)] place-items-center rounded-md border border-edge bg-panel/90 text-ink3 shadow-sm backdrop-blur hover:bg-panel2 hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </button>
      <div className="vim-floating-brand pointer-events-auto flex items-center gap-[var(--gap)] rounded-md border border-edge bg-panel/90 px-[var(--pad)] py-[var(--gap)] shadow-sm backdrop-blur">
        <span className="grid h-6 w-6 place-items-center rounded bg-accent text-[var(--accent-contrast)]">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <span className="text-sm font-semibold tracking-tight text-ink">{title}</span>
          <p className="text-[length:var(--fs-2xs)] tabular-nums text-ink3">
            {completedCount}/{levelCount}
          </p>
        </div>
      </div>
      <button
        type="button"
        title={muted ? 'Unmute sounds' : 'Mute sounds'}
        onClick={() => setDojoMuted(!muted)}
        className="vim-floating-home pointer-events-auto grid h-[var(--row)] w-[var(--row)] place-items-center rounded-md border border-edge bg-panel/90 text-ink3 shadow-sm backdrop-blur hover:bg-panel2 hover:text-ink"
      >
        {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
