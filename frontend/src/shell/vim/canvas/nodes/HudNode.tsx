import { Keyboard, Terminal } from 'lucide-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useSyncNodeHandles } from '../hooks/useSyncNodeHandles';
import { MAZE_HUD_SOURCE_HANDLE, HUD_PANEL_HEIGHT } from '../layout/orbitSlots';
import { cn } from '@/lib/utils/cn';
import { MotionsPanelContent } from '../../ui/panels/MotionsPanelContent';
import { StatusPanelContent } from '../../ui/panels/StatusPanelContent';

import { nodeTextWrap } from '@/shell/canvas';
const HIDDEN_HANDLE = '!pointer-events-none !opacity-0 !h-1 !w-1 !min-h-0 !min-w-0 !border-0';

export function HudNode({ id }: NodeProps) {
  useSyncNodeHandles(id);

  return (
    <div
      className="vim-hud-node nodrag flex size-full overflow-hidden rounded-[var(--radius)] border border-edge/80 bg-panel/90 backdrop-blur-md"
      style={{ minHeight: HUD_PANEL_HEIGHT }}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        id={MAZE_HUD_SOURCE_HANDLE}
        className={HIDDEN_HANDLE}
        style={{ left: '50%' }}
      />
      <div className="vim-hud-node__grid grid h-full min-h-0 min-w-0 flex-1 grid-cols-1 min-[768px]:grid-cols-2">
        <div className="flex min-w-0 flex-col border-b border-edge/40 min-[768px]:border-b-0 min-[768px]:border-r">
          <header className="flex shrink-0 items-center gap-3 border-b border-edge/40 px-4 py-3">
            <Terminal className="h-5 w-5 shrink-0 text-accent" />
            <span className={cn('text-lg font-semibold text-ink', nodeTextWrap)}>Status</span>
          </header>
          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-3.5">
            <StatusPanelContent />
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <header className="flex shrink-0 items-center gap-3 border-b border-edge/40 px-4 py-3">
            <Keyboard className="h-5 w-5 shrink-0 text-[var(--team2-stroke)]" />
            <span className={cn('text-lg font-semibold text-ink', nodeTextWrap)}>Motions</span>
          </header>
          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-3.5">
            <MotionsPanelContent />
          </div>
        </div>
      </div>
    </div>
  );
}
