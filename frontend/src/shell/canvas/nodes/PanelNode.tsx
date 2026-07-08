import { useEffect, useState } from 'react';
import {
  Handle,
  NodeResizer,
  NodeToolbar,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
  type NodeProps,
} from '@xyflow/react';
import { useWorkspace } from '@/store/workspace';
import { cn } from '@/lib/utils/cn';
import { panelAccent } from '@/core/panelAccent';
import { panelNodeChrome } from '@/core/panelNodeChrome';
import { PanelNodeBodySlot } from '@/core/panelNodeRegistry';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import type { HeaderDensity } from '@/core/panelNodeBodyTypes';
import { layoutCap, layoutFixedWidth, sidePanelTabs, VIZ_INPUT_HANDLE } from '../layout/layout';
import { HOST_MIN_HEIGHT, HOST_MIN_WIDTH } from '../layout/layoutSlots';
import { nodeTier } from './nodeTokens';
import { handleDotClass, portHandleStyle } from '../edges/canvasHandles';
import { useConnectedComponentsOptional } from '@/lib/canvas';
import { panelBorderRadius, panelFill, panelOpacity, panelStroke } from './panelStyle';
import { useCanvasStatic } from '../CanvasContext';
import { useFitContentSize } from '../hooks/useFitContentSize';
import { useNodeInViewport } from '../hooks/useNodeInViewport';
import { TransportBar } from '../ui/TransportBarCore';

const CHAIN_TINTS = [
  'ring-accent/30',
  'ring-good/30',
  'ring-[color-mix(in_srgb,var(--team1-stroke)_40%,transparent)]',
  'ring-[color-mix(in_srgb,var(--team2-stroke)_40%,transparent)]',
] as const;

export function PanelNode({ id, data, selected, width, height }: NodeProps<PanelFlowNode>) {
  const nodeStyle = data.style;
  const kind = data.kind ?? id;
  const chrome = panelNodeChrome(kind);
  const kindAccent = panelAccent(data.kind);
  const accent = panelStroke(nodeStyle, data.accent ?? kindAccent);
  const {
    dir,
    mode,
    density,
    present,
    tweaks,
    sidePanelTab,
    setSidePanelTab,
    setRightOpen,
    setRightTab,
  } = useWorkspace();
  const { plugin, item } = useCanvasStatic();
  const isViz = data.kind === 'viz';
  const isWhiteboard = data.kind === 'whiteboard';
  const isProblem = data.kind === 'problem';
  const isWorkbench = data.kind === 'workbench';
  const isCodeLike = !!chrome.codeLike;
  const showTargetHandle = !chrome.hideTargetHandle;
  const headerData =
    (isProblem || isWorkbench) && mode === 'visualize' ? { ...data, title: item.title } : data;
  const collapsed = !!data.collapsed;
  const showSourceHandle = !collapsed;
  const locked = !!data.locked;
  const headerDensity: HeaderDensity =
    density === 'spacious' ? 'spacious' : density === 'ultra' ? 'ultra' : 'compact';
  const maxPanelW = layoutFixedWidth(kind);
  const bodyCap = layoutCap(kind);
  const narrowBody = nodeTier(kind) === 'narrow';
  const snapFill = !!data.snapFill && mode === 'visualize';
  const hasLayoutHost = !!data.layoutSlots?.some(Boolean);
  const layoutHostMode = mode === 'visualize' && (!!data.layoutHost || hasLayoutHost);
  const isSlottedChild = data.slotIndex != null && mode === 'visualize';
  const panelRef = useFitContentSize(
    id,
    kind,
    collapsed,
    !snapFill && !layoutHostMode && !isSlottedChild,
  );
  const inViewport = useNodeInViewport(id);
  const renderHeavyBody = inViewport || selected || collapsed;
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
  const showSideToggle =
    sideTabs.length > 0 && (isWorkbench || isProblem || isViz || isCodeLike || isQuiz);
  const sideLabel = sideTabs[0]?.label ?? 'panel';
  const targetPos =
    mode === 'visualize'
      ? Position.Left
      : mode === 'learn'
        ? Position.Top
        : dir === 'LR'
          ? Position.Left
          : Position.Top;
  const sourcePos =
    mode === 'visualize'
      ? Position.Right
      : mode === 'learn'
        ? Position.Bottom
        : dir === 'LR'
          ? Position.Right
          : Position.Bottom;
  const handleCls = handleDotClass;

  const vizCanvas = isViz && mode === 'visualize';
  const boardCanvas = isWhiteboard && mode === 'visualize';
  const showNodeTransport = vizCanvas && (present || tweaks.controls);
  const visualizeFlush =
    mode === 'visualize' && (isWorkbench || isProblem || isViz || isCodeLike || isWhiteboard);
  const flushBody =
    vizCanvas || boardCanvas || (mode === 'visualize' && (isProblem || isWorkbench));
  const bodyFlex = !!(chrome.bodyFlex || chrome.codeLike);

  const headerProps = {
    id,
    data: headerData,
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
  };
  const headerPropsForSlot = {
    ...headerProps,
    ...(visualizeFlush ? { headerClassName: 'border-b border-edge/60' } : {}),
  };

  return (
    <>
      {showNodeTransport && (
        <NodeToolbar
          nodeId={id}
          position={Position.Top}
          offset={12}
          isVisible={selected && !collapsed}
          className="nowheel nodrag"
        >
          <TransportBar />
        </NodeToolbar>
      )}
      <div
        ref={panelRef}
        data-panel-kind={kind}
        className={cn(
          'panel-node relative flex flex-col overflow-visible rounded-[var(--radius)] bg-panel text-ink transition-[box-shadow,ring-color]',
          snapFill ? 'h-full min-h-0' : 'h-auto',
          hasLayoutHost && 'min-h-0',
          layoutHostMode && 'overflow-visible',
          isSlottedChild && 'overflow-hidden shadow-[var(--shadow-md)]',
          isCodeLike && !collapsed && 'min-h-0 flex-1',
          chrome.panelMinClass && !collapsed && chrome.panelMinClass,
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
          ...(width != null
            ? { width: Math.max(width, layoutHostMode ? HOST_MIN_WIDTH : 0) }
            : layoutHostMode
              ? { width: HOST_MIN_WIDTH }
              : {}),
          ...(snapFill && height != null ? { height, minHeight: height } : {}),
          ...(layoutHostMode && !snapFill
            ? { height: Math.max(height ?? 0, HOST_MIN_HEIGHT), minHeight: HOST_MIN_HEIGHT }
            : {}),
        }}
      >
        {!collapsed && !locked && (
          <NodeResizer
            color="var(--accent)"
            isVisible={selected}
            {...(maxPanelW != null ? { maxWidth: maxPanelW } : {})}
            handleClassName="!h-2.5 !w-2.5 !rounded-full !border-2 !border-accent !bg-panel !shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
          />
        )}

        <div
          className={cn(
            'panel-node__body relative z-0 flex min-h-0 flex-col rounded-[inherit]',
            !renderHeavyBody && 'panel-node__body--deferred',
            visualizeFlush
              ? 'gap-0 px-[var(--node-px,0.75rem)]'
              : 'gap-[var(--node-gap,0.5rem)] px-[var(--node-px,0.75rem)] pb-[var(--node-py,0.5625rem)]',
            bodyFlex && !collapsed && 'min-h-0 flex-1 overflow-hidden',
            chrome.bodyMinClass && !collapsed && `${chrome.bodyMinClass} flex-1 overflow-hidden`,
            snapFill && !collapsed && 'min-h-0 flex-1 overflow-hidden',
            layoutHostMode && !collapsed && 'min-h-0 flex-1 overflow-visible',
            !vizCanvas && !boardCanvas && !snapFill && !layoutHostMode && 'overflow-hidden',
          )}
        >
          {!renderHeavyBody ? (
            <div className="min-h-[3rem] flex-1 rounded-[inherit] bg-panel2/20" aria-hidden />
          ) : (
            <PanelNodeBodySlot
              id={id}
              data={data}
              headerProps={headerPropsForSlot}
              headerDensity={headerDensity}
              flushBody={flushBody}
              vizCanvas={vizCanvas}
              boardCanvas={boardCanvas}
              narrowBody={narrowBody}
              {...(bodyCap != null ? { bodyCap } : {})}
              showBigO={showBigO}
              onBigOOpenChange={setShowBigO}
              collapsed={collapsed}
              {...(layoutHostMode ? { layoutHostMode } : {})}
            />
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
            <Handle
              type="target"
              position={targetPos}
              className={handleCls}
              style={portHandleStyle(targetPos)}
            />
          )
        )}

        {!collapsed && showSourceHandle && !chrome.hideSourceHandle && (
          <Handle
            type="source"
            position={sourcePos}
            className={handleCls}
            style={portHandleStyle(sourcePos)}
          />
        )}
      </div>
    </>
  );
}
