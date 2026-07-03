import type { ComponentType, ReactNode } from 'react';

/** Which sidebar tab a widget lives under. */
export type WidgetTab = 'analysis' | 'canvas' | 'selection' | 'collab' | 'more';

/**
 * A registered canvas sidebar widget. Feature modules contribute descriptors to
 * the registry; the sidebar renders each as a collapsible section via
 * `WidgetSection`, honoring its visibility gate and ordering.
 */
export interface CanvasWidget {
  id: string;
  title: string;
  icon?: ReactNode;
  tab: WidgetTab;
  /** Ascending sort key within a tab. */
  order: number;
  /** The section body. */
  Body: ComponentType;
  /** Optional badge rendered in the section header. */
  Badge?: ComponentType;
  /** Optional max-height class for the scroll region. */
  maxHeightClass?: string;
  /** Optional hook gating whether the widget renders at all. */
  useVisible?: () => boolean;
  /** Whether the section starts expanded (default true). */
  defaultOpen?: boolean;
}
