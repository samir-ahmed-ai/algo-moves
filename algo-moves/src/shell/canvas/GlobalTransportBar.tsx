import { Panel } from '@xyflow/react';
import { SlidersHorizontal } from 'lucide-react';
import { useWorkspace } from '../../lib/workspace';
import { TransportBar } from './TransportBarCore';
import { cn } from '../../lib/cn';
import { CHROME_BTN } from '../chrome';

/** Bottom-centre playback bar — always visible in Visualize when `tweaks.controls` is on. */
export function GlobalTransportBar({ bottomOffset }: { bottomOffset: number | string }) {
  const { mode, present, tweaks, setMobileTransportOpen } = useWorkspace();
  const show = present || (mode === 'visualize' && tweaks.controls);
  if (!show) return null;

  const mb = typeof bottomOffset === 'number' ? `${bottomOffset}px` : bottomOffset;

  return (
    <Panel position="bottom-center" className="!m-0" style={{ bottom: `calc(${mb} + 8px)` }}>
      <div className="hidden md:block">
        <TransportBar />
      </div>
      <button
        type="button"
        onClick={() => setMobileTransportOpen(true)}
        className={cn(
          'nodrag flex min-h-[var(--row)] items-center gap-1.5 rounded-full border border-edge bg-panel/95 px-3 py-1 shadow-[var(--shadow-lg)] backdrop-blur md:hidden',
          CHROME_BTN,
        )}
        title="Open transport controls"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-ink2" />
        <span className="text-xs text-ink2">Transport</span>
      </button>
    </Panel>
  );
}
