import { SlidersHorizontal } from 'lucide-react';
import { useWorkspace } from '../../lib/workspace';
import { TransportBar } from './TransportBarCore';
import { cn } from '../../lib/cn';
import { CHROME_BTN } from '../chrome';

/** Playback bar docked to the bottom of the visualizer panel. */
export function GlobalTransportBar() {
  const { mode, present, tweaks, setMobileTransportOpen } = useWorkspace();
  const show = present || (mode === 'visualize' && tweaks.controls);
  if (!show) return null;

  return (
    <div className="shrink-0 border-t border-edge/60 px-[var(--node-px,16px)] py-1.5">
      <div className="hidden w-full justify-center md:flex">
        <TransportBar />
      </div>
      <button
        type="button"
        onClick={() => setMobileTransportOpen(true)}
        className={cn(
          'nodrag flex min-h-[var(--row)] w-full items-center justify-center gap-1.5 rounded-full border border-edge bg-panel/95 px-3 py-1 shadow-[var(--shadow-lg)] backdrop-blur md:hidden',
          CHROME_BTN,
        )}
        title="Open transport controls"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-ink2" />
        <span className="text-xs text-ink2">Transport</span>
      </button>
    </div>
  );
}
