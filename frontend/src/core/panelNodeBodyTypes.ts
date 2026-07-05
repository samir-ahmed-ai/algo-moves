import type { ReactNode } from 'react';
import type { PanelNodeData } from './panelFlowTypes';

export type HeaderDensity = 'compact' | 'spacious' | 'ultra';

export type PanelNodeHeaderProps = {
  id: string;
  data: PanelNodeData;
  accent: string;
  selected: boolean;
  collapsed: boolean;
  density: HeaderDensity;
  mode: string;
  showBigO: boolean;
  onToggleBigO: () => void;
  showSideToggle: boolean;
  sideOpen: boolean;
  sideLabel: string;
  onToggleSide: () => void;
  inlineToolbar?: ReactNode;
  headerClassName?: string;
};

export type PanelNodeBodyProps = {
  id: string;
  data: PanelNodeData;
  headerProps: PanelNodeHeaderProps;
  headerDensity: HeaderDensity;
  flushBody: boolean;
  vizCanvas: boolean;
  boardCanvas: boolean;
  narrowBody: boolean;
  bodyCap?: number;
  showBigO: boolean;
  onBigOOpenChange: (open: boolean) => void;
  collapsed: boolean;
};
