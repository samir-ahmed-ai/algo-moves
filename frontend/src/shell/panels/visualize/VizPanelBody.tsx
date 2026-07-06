import { useRef } from 'react';
import { useWorkspace } from '@/store/workspace';
import { cn } from '@/lib/utils/cn';
import { ErrorBoundary } from '../../ErrorBoundary';
import { FlipFrame } from '@/components/shared/FlipFrame';
import { MoveOrbit } from '@/components/shared/MoveOrbit';
import { BigOPanelBody } from './BigOPanelBody';
import { Transport } from '../shared/Transport';

import { isConceptCourse } from '@/lib/canvas/conceptCourse';
import { useCanvasFrame, useCanvasStatic, ControlsAccordion, nodeText, VizFitBox } from '@/shell/canvas';

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
  const { plugin, inputId, selectedNode, setSelectedNode, item } = useCanvasStatic();
  const { frames, frame, player } = useCanvasFrame();
  const { mode } = useWorkspace();
  const View = plugin.View;
  const inVisualize = mode === 'visualize';
  const conceptCourse = isConceptCourse(item);
  const vizMeasureRef = useRef<HTMLDivElement>(null);

  const viewInner = (
    <ErrorBoundary resetKey={`${plugin.meta.id}:${inputId}`} label={plugin.meta.id}>
      <View frame={frame} onSelectNode={setSelectedNode} selectedNode={selectedNode} />
    </ErrorBoundary>
  );

  const viewEl = conceptCourse ? (
    viewInner
  ) : (
    <FlipFrame frameKey={player.index} resetKey={`${plugin.meta.id}:${inputId}`}>
      {viewInner}
    </FlipFrame>
  );

  return (
    <div
      className={cn(
        'flex flex-col',
        nodeText.base,
        inVisualize
          ? 'gap-0'
          : 'h-full min-h-0 gap-2',
      )}
    >
      {!inVisualize && !conceptCourse && (
        <MoveOrbit frames={frames} index={player.index} onSeek={player.goTo} />
      )}
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
      ) : conceptCourse ? (
        <div className="viz-trace-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[calc(var(--radius)-2px)] border border-edge/60 bg-panel2/30 p-2">
          {viewEl}
        </div>
      ) : (
        <VizFitBox
          className="viz-board-col viz-board-col--fit h-full min-h-0 flex-1 rounded-[calc(var(--radius)-2px)] border border-edge/60 bg-panel2/30"
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
