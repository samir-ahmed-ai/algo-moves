import type { Node } from '@xyflow/react';
import type { PanelNodeStyle } from '../canvas/nodes/panelStyle';

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
