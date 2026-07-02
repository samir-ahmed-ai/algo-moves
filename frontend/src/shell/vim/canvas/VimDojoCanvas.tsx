import { useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import { cn } from '../../../lib/cn';
import { KeyboardHud } from '../ui/KeyboardHud';
import { onVimFlowError } from './canvasFlowErrors';
import { vimNodeTypes } from './nodes';
import { OrbitEdge } from './edges/OrbitEdge';
import { useVimGame } from './VimGameProvider';
import { useVimKeyboard } from './hooks/useVimKeyboard';
import { useStudioLayout } from './hooks/useStudioLayout';
import { VimLayoutProvider } from './VimLayoutContext';
import { HUD_NODE_ID, MAZE_NODE_ID } from './layout/orbitSlots';

const edgeTypes = { orbit: OrbitEdge };
const FIT_PADDING = 0.12;
const FIT_MAX_ZOOM = 2.5;
const STUDIO_NODES = [{ id: HUD_NODE_ID }, { id: MAZE_NODE_ID }];

function VimDojoFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { grid } = useVimGame();
  useVimKeyboard();

  const { nodes, edges, onNodesChange, onEdgesChange, cellSize } = useStudioLayout(grid, containerRef);

  return (
    <VimLayoutProvider cellSize={cellSize}>
      <div ref={containerRef} className="size-full min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={vimNodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={[1, 2]}
          zoomOnScroll
          minZoom={0.2}
          maxZoom={FIT_MAX_ZOOM}
          fitView
          fitViewOptions={{ padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, nodes: STUDIO_NODES }}
          proOptions={{ hideAttribution: true }}
          onError={onVimFlowError}
          className="vim-dojo-canvas"
          style={{ width: '100%', height: '100%' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--edge)" />
          <Panel position="bottom-right" className="!mb-4 !mr-4">
            <KeyboardHud />
          </Panel>
          <Panel position="bottom-center" className="!mb-3">
            <p className="rounded-md border border-edge/60 bg-panel/70 px-2 py-1 text-[10px] text-ink3 backdrop-blur">
              Pan: middle/right drag · Scroll: zoom · Keys: h j k l …
            </p>
          </Panel>
        </ReactFlow>
      </div>
    </VimLayoutProvider>
  );
}

export function VimDojoCanvas({ className }: { className?: string }) {
  return (
    <div className={cn('size-full min-h-0', className)}>
      <ReactFlowProvider>
        <VimDojoFlow />
      </ReactFlowProvider>
    </div>
  );
}
