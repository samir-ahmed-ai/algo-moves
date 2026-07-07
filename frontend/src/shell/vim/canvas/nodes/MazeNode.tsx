import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils/cn';
import { useVimGame } from '../VimGameProvider';
import { useVimCellSize } from '../VimLayoutContext';
import { useSyncNodeHandles } from '../hooks/useSyncNodeHandles';
import { MazeBoard } from '../../ui/MazeBoard';
import { HUD_TARGET_HANDLE } from '../layout/orbitSlots';

const HIDDEN_HANDLE = '!pointer-events-none !opacity-0 !h-1 !w-1 !min-h-0 !min-w-0 !border-0';

export function MazeNode({ id }: NodeProps) {
  useSyncNodeHandles(id);
  const cellSize = useVimCellSize();
  const { level, cursor, visited, shake, complete, showHint, mazeFocusRef } = useVimGame();

  return (
    <div
      ref={mazeFocusRef}
      tabIndex={0}
      onPointerDown={() => mazeFocusRef.current?.focus()}
      className={cn(
        'vim-maze-node relative nodrag flex size-full min-h-0 min-w-0 overflow-hidden rounded-[var(--radius)] border border-edge/80 bg-panel/90 p-3 outline-none backdrop-blur-md',
        'focus:border-accent/60 focus:ring-2 focus:ring-accent/25',
        complete && 'ring-2 ring-good/40',
      )}
      aria-label="Vim maze — click then type motions"
    >
      <Handle
        type="target"
        position={Position.Top}
        id={HUD_TARGET_HANDLE}
        className={HIDDEN_HANDLE}
        style={{ left: '50%' }}
      />
      <div className="w-[3px] shrink-0 self-stretch rounded-full bg-accent/80" aria-hidden />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pl-2">
        <p className="vim-maze-node__title truncate">{level.title}</p>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <MazeBoard
            grid={level.grid}
            cursor={cursor}
            goal={level.goal}
            visited={visited}
            shake={shake}
            complete={complete}
            showHint={showHint}
            hint={level.hint}
            cellSize={cellSize}
          />
        </div>
      </div>
    </div>
  );
}
