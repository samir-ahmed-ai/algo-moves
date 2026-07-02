import { useRef } from 'react';
import { useWorkspace } from '@/store/workspace';
import { cn } from '@/lib/utils/cn';
import { ErrorBoundary } from '../../ErrorBoundary';
import { useCanvasFrame, useCanvasStatic } from '../CanvasContext';
import { ControlsAccordion, nodeText, nodeTextWrap, VizFitBox } from '../nodeui';
import { BigOPanelBody } from './BigOPanelBody';
import { Transport } from './shared/Transport';

/** Live move caption — status bar at top of viz body (Strudel-style). */
export function VizStatusBar() {
  const { player, frame } = useCanvasFrame();
  const note = frame.move?.note?.trim();
  const frameType = frame.move?.type ?? 'frame';
  const toneClass =
    frame.move?.tone === 'good'
      ? 'text-good border-good/60 bg-goodbg/30'
      : frame.move?.tone === 'bad'
        ? 'text-bad border-bad/60 bg-badbg/30'
        : 'text-ink border-edge/70 bg-panel2/80';
  if (!note && player.total <= 1) return null;
  return (
    <div
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-1.5 border-b border-edge/40 px-[var(--node-px,16px)] py-1',
        nodeText.xs,
        'font-mono text-ink3',
      )}
    >
      <span className={cn('min-w-0 flex-1', nodeTextWrap)}>{note || 'Step through the algorithm'}</span>
      <span className={cn('shrink-0 rounded-full border px-2 py-0.5', toneClass)}>{frameType}</span>
      <span className="shrink-0 font-mono tabular-nums">
        {player.index + 1}/{player.total}
      </span>
      {player.speed !== 1 && <span className="shrink-0 rounded-full border border-edge bg-panel2/50 px-2 py-0.5">{player.speed}×</span>}
    </div>
  );
}

/**
 * Stacked: the board renders at natural size on the top row, the Controls rail
 * below it. Replay / Inspector / Metrics live in the right sidebar Analysis tab.
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
  const vizMeasureRef = useRef<HTMLDivElement>(null);

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
          ? 'gap-0'
          : 'min-h-[calc(100vh-var(--chrome-bottom,0px)-var(--chrome-top,0px)-96px)] gap-2',
      )}
    >
      {!inVisualize && <VizStatusBar />}
      {inVisualize ? (
        <div ref={vizMeasureRef} className="flex min-w-0 justify-center">
          <VizFitBox
            layout="hug"
            measureRef={vizMeasureRef}
            className="viz-board-col viz-board-col--fit viz-board-col--canvas"
            remeasureKey={`${inputId}-${player.index}-${frame.move.type}`}
          >
            {viewEl}
          </VizFitBox>
        </div>
      ) : (
        <VizFitBox
          className="viz-board-col viz-board-col--fit min-h-[260px] flex-1 rounded-[calc(var(--radius)-2px)] border border-edge/60 bg-panel2/30"
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
