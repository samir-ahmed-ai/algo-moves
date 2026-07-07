/**
 * Public canvas shell API — cross-feature imports should use `@/shell/canvas`
 * instead of deep paths under `shell/canvas/**`.
 */

// Stage
export { CanvasStage } from './CanvasStage';

// Context (re-exported from lib/canvas via CanvasContext.tsx)
export {
  CanvasStaticContext,
  CanvasFrameContext,
  CanvasActionsContext,
  CanvasStaticProvider,
  CanvasFrameProvider,
  CanvasActionsProvider,
  useCanvasStatic,
  useCanvasFrame,
  useCanvasActions,
  type CanvasStatic,
  type CanvasFrame,
  type CanvasActions,
} from './CanvasContext';

// Collab
export {
  CanvasCollabProvider,
  useCanvasCollab,
  useCanvasCollabOptional,
  NodePresenceAvatars,
  SubDocSyncProvider,
  useSubDocSyncContext,
  useSubDocSync,
  useQuizHostRelay,
  type CanvasDoc,
  isCanvasDoc,
  SUBDOC_TAG,
  type SubDocSnapshot,
  type WhiteboardPayload,
  type EditorPayload,
} from '@/shell/collab';

// Layout
export {
  layoutEstimate,
  layoutCap,
  layoutFixedWidth,
  layoutSize,
  nodeTier,
  CANVAS_MARGIN,
  CANVAS_NODE_SEP,
  VIZ_WIRE_GAP,
  STANDALONE_CANVAS_KEY,
  STANDALONE_INTERVIEW_CANVAS_KEY,
  LAYOUT_PRESETS,
  defaultEdgeOpts,
  CATEGORY_ORDER,
  DOCK_ONLY_PANELS,
  SIDE_DOCK_WIDTH,
  nodeCategory,
  kindTitle,
  sidePanelTabs,
  modeNodeIds,
  STANDALONE_ADDABLE_PANELS,
  standaloneNodeIds,
  buildNodes,
  LAYOUT_PRESET_META,
  NAMED_LAYOUT_PRESETS,
  NAMED_LAYOUT_PRESET_META,
  resolveNamedLayoutPreset,
  presetRemoved,
  nodeForKind,
  DEPRECATED_VISUALIZE_EDGES,
  REQUIRED_VISUALIZE_EDGES,
  VIZ_INPUT_HANDLE,
  buildEdges,
  nextPracticePanel,
  edgesForKind,
  layoutVisualizeCanvas,
  layoutLearnCanvas,
  layoutGraph,
  ACCENTS,
  FIT_PADDING,
  FIT_PADDING_VIEW,
  FIT_PADDING_FOCUS,
  connectionLineType,
  edgeConnectionLabel,
  styleEdges,
  type LayoutPreset,
  type LayoutVisualizeOptions,
  type BgVariant,
  type EdgePathType,
  type EdgeOpts,
  type LayoutDir,
} from './layout/layout';

// Frame
export { stepExampleInput, exampleInputIndex } from './frame/exampleInputNav';
export {
  buildCanvasFrame,
  organizeCurrentCanvasFrame,
  type CanvasFrameInput,
  type SavedNodeLayout,
} from './frame/canvasFrame';

// Nodes
export { PanelNode } from './nodes/PanelNode';
export { PanelBody, nodeIcon, panelAccent } from '@/shell/panels';
export type { PanelFlowNode, PanelNodeData } from '@/core/panelFlowTypes';
export { togglePanelCollapse } from './nodes/panelCollapse';
export { setMeasuredHeight, getMeasuredHeight } from './nodes/measuredCache';
export { PROBLEM_DND_KEY, encodeProblemDrag } from './nodes/problemDnD';
export type { PanelNodeStyle, PanelCornerStyle } from '@/core/panelFlowTypes';
export { useFitContentSize } from './hooks/useFitContentSize';
export { STRUDEL_NODE_W, layoutHeight, sizeOf } from './nodes/nodeTokens';

// Tokens
export {
  NODE_W,
  FIT_VIEW_DURATION_MS,
  MIN_VIEWPORT_HEIGHT,
  scaleFromNodeWidth,
  canvasNodeSep,
  vizWireGap,
  handlePortOffset,
  vizMinWidth,
} from './ui/canvasTokens';

// Panel UI primitives (canvas-facing entry; shared Chip/Meter/Pill live in @/design/components)
export * from './ui/nodeui';

// Chrome dialogs & transport
export { InterviewPanelTray } from './ui/InterviewPanelTray';
export { TransportBar } from './ui/TransportBarCore';
export { SettingsDialog } from './ui/SettingsDialog';
export { MobileTransportSheet } from './ui/MobileTransportSheet';
export { ShareUrlPopover } from './ui/ShareUrlPopover';
export { SaveProjectDialog } from './ui/SaveProjectDialog';
