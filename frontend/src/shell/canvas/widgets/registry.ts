import type { CanvasWidget, WidgetTab } from './types';
import { BUILTIN_WIDGETS } from './builtins';
import { COLLAB_WIDGETS, SAVED_CANVASES_WIDGET } from '@/shell/collab';
import { INTERVIEW_WIDGETS, SESSIONS_LIST_WIDGET } from '@/shell/interview';

/**
 * The full set of registered canvas widgets — the single source the sidebar
 * assembles itself from. Mirrors `panelRegistry`: a static, aggregated array.
 * Feature modules contribute by adding their descriptors here; the sidebar
 * never changes.
 */
export const CANVAS_WIDGETS: CanvasWidget[] = [
  ...BUILTIN_WIDGETS,
  ...COLLAB_WIDGETS,
  ...INTERVIEW_WIDGETS,
  SESSIONS_LIST_WIDGET,
  SAVED_CANVASES_WIDGET,
];

/** Registered widgets for a tab, in ascending declared order. */
export function widgetsForTab(tab: WidgetTab): CanvasWidget[] {
  return CANVAS_WIDGETS.filter((w) => w.tab === tab).sort((a, b) => a.order - b.order);
}
