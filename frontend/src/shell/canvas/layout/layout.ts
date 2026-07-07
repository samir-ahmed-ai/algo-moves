/**
 * Layout barrel — re-exports presets, wiring, algorithms, and edge styles.
 * Canvas layout/edge preference data + types live in `@/lib/canvas/layoutPrefs`.
 */
export {
  LAYOUT_PRESETS,
  defaultEdgeOpts,
  type LayoutPreset,
  type LayoutVisualizeOptions,
  type BgVariant,
  type EdgePathType,
  type EdgeOpts,
} from '@/lib/canvas/layoutPrefs';

export { CATEGORY_ORDER, DOCK_ONLY_PANELS } from '../../../core/panelRegistry';

export {
  layoutEstimate,
  layoutCap,
  layoutFixedWidth,
  layoutSize,
  nodeTier,
  CANVAS_MARGIN,
  CANVAS_NODE_SEP,
  VIZ_WIRE_GAP,
} from '../tokens';

export * from './layoutPresets';
export * from './layoutWiring';
export * from './layoutAlgorithms';
export * from './edgeStyles';
export * from './canvasSnap';
