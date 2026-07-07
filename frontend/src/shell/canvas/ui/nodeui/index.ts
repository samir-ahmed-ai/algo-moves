/**
 * Node design system — barrel re-export. Implementation split across `nodeui/*`
 * modules; import from here to keep the canvas-facing API stable.
 */
export { Chip, EmptyState, Meter, Pill } from '@/design/components';
export { difficultyTone, type UiTone } from '@/design/tone';
export { nodeText, nodeTextWrap, nodeIconGlyph, RADIUS_CTRL, RADIUS_SHELL } from '@/design/typography';
export { Label, Hint, Btn, Field, TextInput, TextArea, INPUT_CLS } from '@/components/shared/formControls';
export { VizFitBox, MiniTabs } from '@/components/shared/vizFit';
export {
  computeVizFitLayout,
  resolveMeasureSize,
  resolveVizStageMeasureSize,
  type VizFitLayout,
} from '@/lib/canvas/vizFitMeasure';

export type { HeaderDensity } from '../nodeHeader';
export {
  PanelBody,
  PanelHeader,
  PanelHeaderActions,
  PanelHeaderGrip,
  PanelHeaderIcon,
  PanelHeaderMeta,
  PanelHeaderSub,
  PanelHeaderTitle,
} from '../nodeHeader';
export type { PanelHeaderActionVariant, PanelHeaderMenuItem } from '../nodeActions';
export { PanelHeaderAction, PanelHeaderMenu } from '../nodeActions';

export { Section, Rule, ControlsAccordion } from './sections';
export { useFlash, Stat, StatGrid, StreakPips } from './stats';
export { NodeTagChip, DefRow, Banner, Code, Spark } from './display';
export { SearchInput, Option, Row, CheckRow } from './interactive';
