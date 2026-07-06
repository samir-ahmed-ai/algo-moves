import type { Node } from '@xyflow/react';

export type PanelCornerStyle = 'theme' | 'sharp' | 'soft' | 'round';

export interface PanelNodeStyle {
  opacity?: number;
  fill?: string;
  stroke?: string;
  corners?: PanelCornerStyle;
}

export interface PanelNodeData extends Record<string, unknown> {
  kind: string;
  title: string;
  /** Whole-node minimize: body hidden, height shrunk to the header (transient). */
  collapsed?: boolean;
  /** Height to restore to when un-minimized. */
  fullHeight?: number;
  /** Per-node accent override picked from the toolbar. */
  accent?: string;
  /** Chain playback state (Strudel running/paused/stopped). */
  runState?: 'running' | 'paused' | 'stopped';
  /** Locked panels cannot be dragged, resized, or removed. */
  locked?: boolean;
  /** When true, panel fills the snapped viewport height instead of auto-sizing to content. */
  snapFill?: boolean;
  /** 9 slot indices (0=top-left … 8=bottom-right). Values are child node ids. */
  layoutSlots?: (string | null)[];
  /** Which slot this node occupies when parented (0–8). */
  slotIndex?: number;
  /** Host shows a 3×3 layout frame instead of normal panel body. */
  layoutHost?: boolean;
  /** Per-node appearance overrides (stroke, fill, opacity, corners). */
  style?: PanelNodeStyle;
  /** Persisted sub-document (whiteboard scene or shared editor) for solo/offline. */
  subDoc?: {
    nodeId: string;
    kind: 'whiteboard' | 'collab-code';
    rev: number;
    payload: unknown;
  };
}

export type PanelFlowNode = Node<PanelNodeData, 'panel'>;
