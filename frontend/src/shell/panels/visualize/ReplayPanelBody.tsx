import { ListOrdered } from 'lucide-react';
import { useWorkspace } from '@/store/workspace';
import { MoveLog } from '../../../components/shared/MoveLog';
import { Transport } from '../shared/Transport';

import { useCanvasFrame, ControlsAccordion, EmptyState } from '@/shell/canvas';
export function ReplayContent({ columns = 2 }: { columns?: number }) {
  const { frames, player, frame } = useCanvasFrame();
  const { tweaks } = useWorkspace();
  if (!tweaks.caption && !tweaks.moveLog) {
    return (
      <EmptyState
        icon={<ListOrdered className="h-5 w-5" />}
        title="Replay hidden"
        hint="Enable captions or moves in Controls."
      />
    );
  }
  return (
    <div className="viz-replay-content flex flex-col gap-2">
      {tweaks.caption && (
        <div
          className={`caption viz-caption ${frame.move.tone ?? 'default'}`}
          style={{ marginTop: 0 }}
        >
          {frame.move.caption}
        </div>
      )}
      {tweaks.moveLog && (
        <MoveLog
          moves={frames.map((f) => f.move)}
          index={player.index}
          onSelect={player.goTo}
          columns={columns}
          breakpoints={player.breakpoints}
          onToggleBreakpoint={player.toggleBreakpoint}
        />
      )}
    </div>
  );
}

export function ReplayPanelBody() {
  const { mode } = useWorkspace();
  return (
    <div className="viz-replay-panel flex flex-col gap-2">
      <ReplayContent columns={2} />
      {mode !== 'visualize' && (
        <ControlsAccordion>
          <Transport />
        </ControlsAccordion>
      )}
    </div>
  );
}
