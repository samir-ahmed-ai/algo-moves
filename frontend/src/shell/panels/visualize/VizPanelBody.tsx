import { useRef } from 'react';
import { useWorkspace } from '@/store/workspace';
import { cn } from '@/lib/utils/cn';
import { ErrorBoundary } from '../../ErrorBoundary';
import { FlipFrame } from '@/components/shared/FlipFrame';
import { BigOPanelBody } from './BigOPanelBody';
import { Transport } from '../shared/Transport';

import { isConceptCourse } from '@/lib/canvas/conceptCourse';
import {
  useCanvasFrame,
  useCanvasStatic,
  ControlsAccordion,
  nodeText,
  VizFitBox,
} from '@/shell/canvas';
import { useCanvasFrameFollow } from '@/shell/collab';
import { useDesignHybridHidesTransport } from '@/plugins/imported/prepSimulators/designDiagrams/designHybridState';

/**
 * Stacked: the board renders at natural size on the top row, the Controls rail
 * below it. Replay / Inspector / Metrics live in the right sidebar Analysis tab.
 */
export function VizPanelBody({
  nodeId,
  showBigO,
  onBigOOpenChange,
  showTransport = true,
}: {
  nodeId?: string;
  showBigO?: boolean;
  onBigOOpenChange?: (open: boolean) => void;
  showTransport?: boolean;
}) {
  const { plugin, inputId, selectedNode, setSelectedNode, item } = useCanvasStatic();
  const { frame, player, changedKeys } = useCanvasFrame();
  const { mode } = useWorkspace();
  useCanvasFrameFollow(nodeId ?? 'viz', !!nodeId && mode === 'visualize');
  const View = plugin.View;
  const inVisualize = mode === 'visualize';
  const conceptCourse = isConceptCourse(item);
  const hybridHidesTransport = useDesignHybridHidesTransport(plugin.meta.designHybrid);
  const isStatic = !!plugin.meta.static || hybridHidesTransport;
  const vizMeasureRef = useRef<HTMLDivElement>(null);

  const viewInner = (
    <ErrorBoundary resetKey={`${plugin.meta.id}:${inputId}`} label={plugin.meta.id}>
      <View frame={frame} onSelectNode={setSelectedNode} selectedNode={selectedNode} />
    </ErrorBoundary>
  );

  const viewEl =
    conceptCourse || isStatic ? (
      viewInner
    ) : (
      <FlipFrame frameKey={player.index} resetKey={`${plugin.meta.id}:${inputId}`}>
        {viewInner}
      </FlipFrame>
    );

  return (
    <div
      className={cn('flex flex-col', nodeText.base, inVisualize ? 'gap-0' : 'h-full min-h-0 gap-2')}
    >
      {isStatic ? (
        // Static design diagrams fill their own area (self-measured layout), so
        // skip VizFitBox letterbox scaling and hand them the whole panel.
        <div className="viz-design-stage ws-scroll flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          {viewEl}
        </div>
      ) : inVisualize ? (
        <div ref={vizMeasureRef} className="viz-panel-stage flex min-w-0 justify-center">
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
        <div className="viz-trace-panel viz-panel-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[calc(var(--radius)-2px)] border border-edge/60 bg-panel2/30 p-2">
          {viewEl}
        </div>
      ) : (
        <VizFitBox
          className={cn(
            'viz-board-col viz-board-col--fit viz-panel-card h-full min-h-0 flex-1 rounded-[calc(var(--radius)-2px)] border bg-panel2/30 transition-colors duration-200',
            changedKeys.length > 0 ? 'border-accent/50 ring-1 ring-accent/20' : 'border-edge/60',
          )}
          remeasureKey={`${inputId}-${player.index}-${frame.move.type}`}
        >
          {changedKeys.length > 0 && (
            <div className="viz-delta-strip mb-1 flex flex-wrap gap-1 px-1 pt-1">
              {changedKeys.map((k) => (
                <span
                  key={k}
                  className="viz-delta-chip rounded-full border border-accent/40 bg-accentbg/40 px-1.5 py-px font-mono text-[length:var(--fs-tight)] text-accent"
                >
                  Δ {k}
                </span>
              ))}
            </div>
          )}
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
      {!inVisualize && showTransport && !isStatic && (
        <ControlsAccordion>
          <Transport />
        </ControlsAccordion>
      )}
    </div>
  );
}
