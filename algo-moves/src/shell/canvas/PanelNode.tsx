import { useEffect, useState } from 'react';
import { Handle, NodeResizer, Position, useReactFlow, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { useWorkspace } from '../../lib/workspace';
import { cn } from '../../lib/cn';
import { layoutCap, layoutFixedWidth, sidePanelTabs, VIZ_INPUT_HANDLE } from './layout';
import { nodeTier } from './nodeTokens';
import { handleDotClass, portHandleStyle } from './canvasHandles';
import { useConnectedComponentsOptional } from '../../lib/ConnectedComponentsContext';
import { panelBorderRadius, panelFill, panelOpacity, panelStroke } from './panelStyle';

const CHAIN_TINTS = [
  'ring-accent/30',
  'ring-good/30',
  'ring-[color-mix(in_srgb,var(--team1-stroke)_40%,transparent)]',
  'ring-[color-mix(in_srgb,var(--team2-stroke)_40%,transparent)]',
] as const;
import { CodeStudioBody, CodeStudioFooter, CodeStudioProvider, CodeStudioToolbar } from './CodeStudio';
import { useCanvasStatic } from './CanvasContext';
import { PanelBody as PanelBodyShell, type HeaderDensity } from './nodeui';
import { PanelBody } from './panels/PanelBodyRouter';
import { panelAccent } from './panels/panelIcons';
import type { PanelFlowNode } from './panels/panelTypes';
import { PanelNodeHeader } from './panels/PanelNodeHeader';
import { HeaderExamplesNav } from './panels/PanelHeaderControls';
import { useFitContentSize } from './panels/useFitContentSize';
import { VizPanelBody } from './panels/VizPanelBody';

export type { PanelFlowNode, PanelNodeData } from './panels/panelTypes';
export { panelAccent, nodeIcon } from './panels/panelIcons';
export { InspectorPaneContent } from './panels/InspectorPanelBody';
export { ReplayContent } from './panels/ReplayPanelBody';
export { MetricsBody } from './panels/MetricsPanelBody';
export { PanelBody } from './panels/PanelBodyRouter';

export function PanelNode({ id, data, selected, width }: NodeProps<PanelFlowNode>) {
  const nodeStyle = data.style;
  const kindAccent = panelAccent(data.kind);
  const accent = panelStroke(nodeStyle, data.accent ?? kindAccent);
  const { dir, mode, density, sidePanelTab, setSidePanelTab, setRightOpen, setRightTab } = useWorkspace();
  const { plugin } = useCanvasStatic();
  const isViz = data.kind === 'viz';
  const isReassemble = data.kind === 'reassemble';
  const isRecall = data.kind === 'recall';
  const isCode = data.kind === 'code' || data.kind === 'scratch' || isReassemble || isRecall;
  const isProblem = data.kind === 'problem';
  const isExamples = data.kind === 'examples';
  const showTargetHandle = !isProblem && !isExamples;
  const collapsed = !!data.collapsed;
  const showSourceHandle = !collapsed;
  const locked = !!data.locked;
  const headerDensity: HeaderDensity = density === 'spacious' ? 'spacious' : density === 'ultra' ? 'ultra' : 'compact';
  const maxPanelW = layoutFixedWidth(data.kind ?? id);
  const bodyCap = layoutCap(data.kind ?? id);
  const narrowBody = nodeTier(data.kind ?? id) === 'narrow';
  const panelRef = useFitContentSize(id, data.kind ?? id, collapsed, true);
  const [showBigO, setShowBigO] = useState(false);
  const { setNodes } = useReactFlow();
  const cc = useConnectedComponentsOptional();
  const chainIdx = cc?.indexOf(id) ?? -1;
  const chainTint = chainIdx >= 0 ? CHAIN_TINTS[chainIdx % CHAIN_TINTS.length] : undefined;

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        const want = !locked;
        if (n.draggable === want) return n;
        return { ...n, draggable: want };
      }),
    );
  }, [id, locked, setNodes]);

  // Handle positions depend on collapse / direction / mode — recompute internals
  // so edges stay anchored after those change.
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [collapsed, dir, mode, id, updateNodeInternals]);

  const sideTabs = sidePanelTabs(plugin, mode);
  const sideOpen = sidePanelTab != null && sideTabs.some((t) => t.id === sidePanelTab);
  const toggleSide = () => {
    if (sideOpen) setSidePanelTab(null);
    else {
      setSidePanelTab(sideTabs[0]?.id ?? null);
      setRightOpen(true);
      setRightTab('analysis');
    }
  };
  const isQuiz = data.kind === 'quiz';
  const showSideToggle = sideTabs.length > 0 && (isProblem || isViz || isCode || isQuiz);
  const sideLabel = sideTabs[0]?.label ?? 'panel';
  const targetPos = mode === 'visualize' ? Position.Left : mode === 'learn' ? Position.Top : dir === 'LR' ? Position.Left : Position.Top;
  const sourcePos = mode === 'visualize' ? Position.Right : mode === 'learn' ? Position.Bottom : dir === 'LR' ? Position.Right : Position.Bottom;
  const handleCls = handleDotClass;

  const vizCanvas = isViz && mode === 'visualize';
  const visualizeFlush = mode === 'visualize' && (isProblem || isExamples || isViz || isCode);
  const flushBody = vizCanvas || (mode === 'visualize' && (isProblem || isExamples));

  const headerProps = {
    id,
    data,
    accent,
    selected,
    collapsed,
    density: headerDensity,
    mode,
    showBigO,
    onToggleBigO: () => setShowBigO((v) => !v),
    sideOpen,
    sideLabel,
    onToggleSide: toggleSide,
    showSideToggle,
    headerClassName: visualizeFlush ? 'border-b border-edge/60' : undefined,
  };

  return (
    <div
      ref={panelRef}
      className={cn(
        'panel-node relative flex h-auto flex-col overflow-visible rounded-[var(--radius)] bg-panel text-ink transition-[box-shadow,ring-color]',
        isCode && !collapsed && 'min-h-0 flex-1',
        'w-full',
        selected && 'selected',
        chainTint && `ring-1 ${chainTint}`,
        'hover:ring-1 hover:ring-[color-mix(in_srgb,var(--ring)_25%,transparent)]',
        locked && !nodeStyle?.opacity && 'opacity-95',
      )}
      style={{
        borderRadius: panelBorderRadius(nodeStyle?.corners),
        opacity: nodeStyle?.opacity != null ? panelOpacity(nodeStyle) : locked ? 0.95 : undefined,
        backgroundColor: panelFill(nodeStyle),
        ...(width != null ? { width } : {}),
      }}
    >
      {!collapsed && !locked && (
        <NodeResizer
          color="var(--accent)"
          isVisible={selected}
          {...(maxPanelW != null ? { maxWidth: maxPanelW } : {})}
          handleClassName="!h-2 !w-2 !rounded-sm !border-accent !bg-panel"
        />
      )}

      <div
        className={cn(
          'panel-node__body relative z-0 flex min-h-0 flex-col rounded-[inherit]',
          visualizeFlush
            ? 'gap-0 px-[var(--node-px,0.75rem)]'
            : 'gap-[var(--node-gap,0.5rem)] px-[var(--node-px,0.75rem)] pb-[var(--node-py,0.5625rem)]',
          isCode && !collapsed && 'min-h-0 flex-1 overflow-hidden',
          !vizCanvas && 'overflow-hidden',
        )}
      >
        {!collapsed && isCode ? (
          <CodeStudioProvider phaseLock={isReassemble ? 'reassemble' : isRecall ? 'recall' : undefined}>
            <PanelNodeHeader
              {...headerProps}
              inlineToolbar={
                <div className="nodrag flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
                  <CodeStudioToolbar />
                </div>
              }
            />
            <div className="nowheel flex min-h-0 flex-1 flex-col overflow-hidden">
              <CodeStudioBody />
            </div>
            <CodeStudioFooter />
          </CodeStudioProvider>
        ) : (
          <>
            <PanelNodeHeader
              {...headerProps}
              inlineToolbar={
                isExamples && !collapsed ? (
                  <div className="nodrag flex shrink-0 items-center gap-0.5">
                    <HeaderExamplesNav />
                  </div>
                ) : undefined
              }
            />

            {!collapsed && (
              <PanelBodyShell
                density={headerDensity}
                fill={isViz && !vizCanvas}
                flush={flushBody}
                narrow={narrowBody}
                style={!isViz && bodyCap ? { maxWidth: bodyCap } : undefined}
              >
                {isViz ? (
                  <VizPanelBody showBigO={showBigO} onBigOOpenChange={setShowBigO} />
                ) : (
                  <PanelBody kind={data.kind} />
                )}
              </PanelBodyShell>
            )}
          </>
        )}
      </div>

      {vizCanvas ? (
        <Handle
          id={VIZ_INPUT_HANDLE}
          type="target"
          position={targetPos}
          className={handleCls}
          style={portHandleStyle(targetPos)}
        />
      ) : (
        showTargetHandle && (
          <Handle type="target" position={targetPos} className={handleCls} style={portHandleStyle(targetPos)} />
        )
      )}

      {!collapsed && showSourceHandle && (
        <Handle type="source" position={sourcePos} className={handleCls} style={portHandleStyle(sourcePos)} />
      )}
    </div>
  );
}
