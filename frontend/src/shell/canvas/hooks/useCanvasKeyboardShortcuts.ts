import { useEffect, type MutableRefObject } from 'react';
import type { FitViewOptions } from '@xyflow/react';
import { isEditableTarget } from '@/lib/utils/keyboard';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import { FIT_PADDING } from '../layout/layout';
import { FIT_VIEW_DURATION_MS } from '../ui/canvasTokens';

/**
 * Canvas keyboard shortcuts, extracted from CanvasStage:
 *   Ctrl/⌘+Z undo, Ctrl/⌘+Shift+Z or Ctrl/⌘+Y redo (#82);
 *   plain `z` zoom-to-fit (or zoom-to-selection) (#77); plain `c` focus-canvas.
 */
export function useCanvasKeyboardShortcuts({
  fitView,
  undo,
  redo,
  toggleFocusCanvas,
  nodesRef,
}: {
  fitView: (options?: FitViewOptions) => void;
  undo: () => void;
  redo: () => void;
  toggleFocusCanvas: () => void;
  nodesRef: MutableRefObject<PanelFlowNode[]>;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      const inField = isEditableTarget(t);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }
      if (!mod && (e.key === 'z' || e.key === 'Z') && !inField) {
        const selected = nodesRef.current.filter((n) => n.selected);
        fitView({
          padding: FIT_PADDING,
          duration: FIT_VIEW_DURATION_MS,
          maxZoom: 1.0,
          ...(selected.length ? { nodes: selected } : {}),
        });
        return;
      }
      if (!mod && (e.key === 'c' || e.key === 'C') && !inField) {
        e.preventDefault();
        toggleFocusCanvas();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fitView, undo, redo, toggleFocusCanvas, nodesRef]);
}
