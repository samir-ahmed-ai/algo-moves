import { useRef } from 'react';
import { useWorkspace } from '@/store/workspace';
import { cn } from '@/lib/utils/cn';
import { ErrorBoundary } from '../../ErrorBoundary';
import { useCanvasFrame, useCanvasStatic } from '../../canvas/CanvasContext';
import { ControlsAccordion, nodeText, VizFitBox } from '../../canvas/ui/nodeui';
import { FlipFrame } from '@/components/shared/FlipFrame';
import { MoveOrbit } from '@/components/shared/MoveOrbit';
import { BigOPanelBody } from './BigOPanelBody';
import { Transport } from '../shared/Transport';
import { moveToneChipClass } from '../shared/frameChips';

/**
 * Live move caption — status bar at top of viz body (Strudel-style).
 * Constant footprint: single line, truncating note, permanently reserved
 * chip slots — the changing text must never reflow the board below it.
 */
export function VizStatusBar() {
  const { player, frame } = useCanvasFrame();
  const note = frame.move?.note?.trim();
  const frameType = frame.move?.type ?? 'frame';
  const toneClass = moveToneChipClass(frame.move?.tone);
  if (!note && player.total <= 1) return null;
  const counterCh = `${String(player.total).length * 2 + 1}ch`;
  return (
    <div
      className={cn(
        'flex min-h-[30px] min-w-0 items-center gap-1.5 border-b border-edge/40 px-[var(--node-px,16px)] py-1',
        nodeText.xs,
        'font-mono text-ink3',
      )}
    >
      <span
        key={note || ''}
        className="viz-status-note min-w-0 flex-1 truncate"
        title={note || undefined}
      >
        {note || 'Step through the algorithm'}
      </span>
      <span className={cn('shrink-0 rounded-full border px-2 py-0.5', toneClass)}>{frameType}</span>
      <span className="shrink-0 text-right font-mono tabular-nums" style={{ minWidth: counterCh }}>
        {player.index + 1}/{player.total}
      </span>
      <span
        className={cn(
          'shrink-0 rounded-full border border-edge bg-panel2/50 px-2 py-0.5 tabular-nums transition-opacity',
          player.speed === 1 && 'opacity-40',
        )}
      >
        {player.speed}×
      </span>
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
  showTransport = true,
}: {
  showBigO?: boolean;
  onBigOOpenChange?: (open: boolean) => void;
  showTransport?: boolean;
}) {
  const { plugin, inputId, selectedNode, setSelectedNode } = useCanvasStatic();
  const { frames, frame, player } = useCanvasFrame();
  const { mode } = useWorkspace();
  const View = plugin.View;
  const inVisualize = mode === 'visualize';
  const vizMeasureRef = useRef<HTMLDivElement>(null);

  const viewEl = (
    <FlipFrame frameKey={player.index} resetKey={`${plugin.meta.id}:${inputId}`}>
      <ErrorBoundary resetKey={`${plugin.meta.id}:${inputId}`} label={plugin.meta.id}>
        <View frame={frame} onSelectNode={setSelectedNode} selectedNode={selectedNode} />
      </ErrorBoundary>
    </FlipFrame>
  );

  return (
    <div
      className={cn(
        'flex flex-col',
        nodeText.base,
        inVisualize
          ? 'gap-0'
          : 'h-full min-h-[260px] gap-2',
      )}
    >
      {!inVisualize && <VizStatusBar />}
      {!inVisualize && <MoveOrbit frames={frames} index={player.index} onSeek={player.goTo} />}
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
      {!inVisualize && showTransport && (
        <ControlsAccordion>
          <Transport />
        </ControlsAccordion>
      )}
    </div>
  );
}
