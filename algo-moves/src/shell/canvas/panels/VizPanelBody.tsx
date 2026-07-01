import { useWorkspace } from '../../../lib/workspace';
import { cn } from '../../../lib/cn';
import { ErrorBoundary } from '../../ErrorBoundary';
import { useCanvasFrame, useCanvasStatic } from '../CanvasContext';
import { ControlsAccordion, nodeText, VizFitBox } from '../nodeui';
import { BigOPanelBody } from './BigOPanelBody';
import { Transport } from './shared/Transport';

/** Live move caption — status bar at top of viz body (Strudel-style). */
export function VizStatusBar() {
  const { player, frame } = useCanvasFrame();
  const note = frame.move?.note?.trim();
  if (!note && player.total <= 1) return null;
  return (
    <div className={cn('flex min-w-0 items-center gap-2 border-b border-edge/40 px-[var(--node-px,16px)] py-1', nodeText.xs, 'font-mono text-ink3')}>
      <span className="min-w-0 flex-1 truncate">{note || 'Step through the algorithm'}</span>
      <span className="shrink-0 font-mono tabular-nums text-ink3">
        {player.index + 1}/{player.total}
      </span>
    </div>
  );
}

/**
 * Stacked: the board renders at natural size on the top row, the Controls rail
 * below it. Replay / Inspector / Metrics now live in the canvas bottom dock
 * (toggled from the Problem node) so the board stays compact.
 */
export function VizPanelBody({
  showBigO,
  onBigOOpenChange,
}: {
  showBigO?: boolean;
  onBigOOpenChange?: (open: boolean) => void;
}) {
  const { plugin, inputId, selectedNode, setSelectedNode } = useCanvasStatic();
  const { frame, player } = useCanvasFrame();
  const { mode } = useWorkspace();
  const View = plugin.View;
  const inVisualize = mode === 'visualize';

  const viewEl = (
    <ErrorBoundary resetKey={`${plugin.meta.id}:${inputId}`} label={plugin.meta.id}>
      <View frame={frame} onSelectNode={setSelectedNode} selectedNode={selectedNode} />
    </ErrorBoundary>
  );

  return (
    <div
      className={cn(
        'flex flex-col',
        nodeText.base,
        inVisualize
          ? 'h-full min-h-0 gap-0'
          : 'min-h-[calc(100vh-var(--chrome-bottom,var(--default-dock-h))-var(--chrome-top,0px)-96px)] gap-2',
      )}
    >
      {!inVisualize && <VizStatusBar />}
      {inVisualize ? (
        <VizFitBox
          className="viz-board-col viz-board-col--fit min-h-0 flex-1"
          remeasureKey={`${inputId}-${player.index}-${frame.move.type}`}
        >
          {viewEl}
        </VizFitBox>
      ) : (
        <VizFitBox
          className="viz-board-col viz-board-col--fit min-h-[200px] flex-1 rounded-[calc(var(--radius)-2px)] border border-edge/60 bg-panel2/30 p-3"
          remeasureKey={`${inputId}-${player.index}-${frame.move.type}`}
        >
          {viewEl}
        </VizFitBox>
      )}
      {inVisualize && showBigO && onBigOOpenChange && (
        <ControlsAccordion
          title="Cost · Big-O"
          open={showBigO}
          onOpenChange={onBigOOpenChange}
          className="shrink-0 border-t border-edge/60"
        >
          <div className="ws-scroll max-h-[220px] overflow-auto">
            <BigOPanelBody />
          </div>
        </ControlsAccordion>
      )}
      {!inVisualize && (
        <ControlsAccordion>
          <Transport />
        </ControlsAccordion>
      )}
    </div>
  );
}
