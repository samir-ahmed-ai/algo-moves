import { useRef } from 'react';
import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Panel } from '@xyflow/react';
import { cn } from '@/lib/utils/cn';
import { KeyboardHud } from '../ui/KeyboardHud';
import { onVimFlowError } from './canvasFlowErrors';
import { vimNodeTypes } from './nodes';
import { OrbitEdge } from './edges/OrbitEdge';
import { useVimGame } from './VimGameProvider';
import { useVimKeyboard } from './hooks/useVimKeyboard';
import { useStudioLayout } from './hooks/useStudioLayout';
import { VimLayoutProvider } from './VimLayoutContext';

const edgeTypes = { orbit: OrbitEdge };

function VimDojoFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { grid, level, newKeys } = useVimGame();
  useVimKeyboard();

  const hintKeys = newKeys.length ? newKeys : level.allowed.slice(0, 8);
  const hintLabel = `${newKeys.length ? 'New' : 'Keys'}: ${hintKeys.join(' ')}`;

  const { nodes, edges, onNodesChange, onEdgesChange, cellSize } = useStudioLayout(
    grid,
    containerRef,
  );

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
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          preventScrolling
          minZoom={1}
          maxZoom={1}
          proOptions={{ hideAttribution: true }}
          onError={onVimFlowError}
          className="vim-dojo-canvas"
          style={{ width: '100%', height: '100%' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--edge)" />
          <Panel position="bottom-right" className="!mb-4 !mr-4">
            <KeyboardHud />
          </Panel>
          <Panel position="bottom-center" className="!mb-3 max-[767px]:hidden">
            <p className="vim-key-hint rounded-md border border-edge/60 bg-panel/70 px-2 py-1 text-[length:var(--fs-2xs)] text-ink3 backdrop-blur">
              {hintLabel} · Esc reset · r retry · ? hint
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
