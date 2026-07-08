import { useLayoutEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useWorkspace } from '@/store/workspace';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import { layoutVisualizeCanvas } from '../layout/layout';
import { setMeasuredHeight } from '../nodes/measuredCache';
import { useCanvasActions } from '../CanvasContext';

/** Sync React Flow node height from DOM measurement; width is layout/user controlled. */
export function useFitContentSize(id: string, kind: string, collapsed: boolean, enabled: boolean) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { setNodes } = useReactFlow();
  const { mode } = useWorkspace();
  const { layoutVisualizeOptions } = useCanvasActions();

  useLayoutEffect(() => {
    if (collapsed || !enabled) return;
    const el = panelRef.current;
    if (!el) return;
    const sync = () => {
      const measuredH = Math.ceil(Math.max(el.scrollHeight, el.offsetHeight));
      const h = measuredH;
      setMeasuredHeight(id, h);
      setNodes((nds) => {
        let changed = false;
        const mapped = nds.map((n) => {
          if (n.id !== id) return n;
          const curH = n.height ?? 0;
          const heightOk = Math.abs(curH - h) < 2;
          if (heightOk) return n;
          changed = true;
          return { ...n, height: h };
        });
        if (!changed) return nds;
        if (mode === 'visualize' && kind === 'workbench') {
          return layoutVisualizeCanvas(mapped as PanelFlowNode[], layoutVisualizeOptions());
        }
        return mapped;
      });
    };
    // The disposed guard matters for snap/tile: disconnect() doesn't cancel an
    // already-scheduled rAF, and a stale sync would overwrite the explicit
    // height the tiler just set.
    let disposed = false;
    const ro = new ResizeObserver(() =>
      requestAnimationFrame(() => {
        if (!disposed) sync();
      }),
    );
    ro.observe(el);
    sync();
    return () => {
      disposed = true;
      ro.disconnect();
    };
  }, [collapsed, enabled, id, kind, layoutVisualizeOptions, mode, setNodes]);

  return panelRef;
}
