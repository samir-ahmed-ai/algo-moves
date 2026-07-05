import { createElement, type ComponentType, type ReactNode } from 'react';
import type { PanelNodeBodyProps } from './panelNodeBodyTypes';

export type { PanelNodeBodyProps, PanelNodeHeaderProps, HeaderDensity } from './panelNodeBodyTypes';

export type PanelNodeBodyRenderer = ComponentType<PanelNodeBodyProps>;

let renderer: PanelNodeBodyRenderer | null = null;

export function registerPanelNodeBodyRenderer(r: PanelNodeBodyRenderer): void {
  renderer = r;
}

export function PanelNodeBodySlot(props: PanelNodeBodyProps): ReactNode {
  if (!renderer) {
    if (import.meta.env.DEV) throw new Error('PanelNodeBody renderer not registered');
    return null;
  }
  return createElement(renderer, props);
}
