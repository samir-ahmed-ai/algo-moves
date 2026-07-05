import { Keyboard, Terminal } from 'lucide-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useSyncNodeHandles } from '../hooks/useSyncNodeHandles';
import { MAZE_HUD_SOURCE_HANDLE } from '../layout/orbitSlots';
import { cn } from '@/lib/utils/cn';
import { MotionsPanelContent } from '../../ui/panels/MotionsPanelContent';
import { StatusPanelContent } from '../../ui/panels/StatusPanelContent';

import { nodeTextWrap } from '@/shell/canvas';
const HIDDEN_HANDLE = '!pointer-events-none !opacity-0 !h-1 !w-1 !min-h-0 !min-w-0 !border-0';

export function HudNode({ id }: NodeProps) {
  useSyncNodeHandles(id);

  return (
    <div className="vim-hud-node nodrag flex w-full overflow-hidden rounded-[var(--radius)] border border-edge/80 bg-panel/90 backdrop-blur-md">
      <Handle
        type="source"
        position={Position.Bottom}
        id={MAZE_HUD_SOURCE_HANDLE}
        className={HIDDEN_HANDLE}
        style={{ left: '50%' }}
      />
      <div className="grid min-w-0 flex-1 grid-cols-2">
        <div className="flex min-w-0 flex-col border-r border-edge/40">
          <header className="flex shrink-0 items-center gap-1.5 border-b border-edge/40 px-2.5 py-1.5">
            <Terminal className="h-3 w-3 shrink-0 text-accent" />
            <span className={cn('text-[11px] font-semibold text-ink', nodeTextWrap)}>Status</span>
          </header>
          <div className="px-2.5 py-2">
            <StatusPanelContent />
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <header className="flex shrink-0 items-center gap-1.5 border-b border-edge/40 px-2.5 py-1.5">
            <Keyboard className="h-3 w-3 shrink-0 text-[var(--team2-stroke)]" />
            <span className={cn('text-[11px] font-semibold text-ink', nodeTextWrap)}>Motions</span>
          </header>
          <div className="px-2.5 py-2">
            <MotionsPanelContent />
          </div>
        </div>
      </div>
    </div>
  );
}
