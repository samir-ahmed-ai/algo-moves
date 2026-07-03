import { useLayoutEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useWorkspace } from '@/store/workspace';
import { useCanvasActions } from '../canvas/CanvasContext';
import { layoutVisualizeCanvas } from '../canvas/layout';
import { setMeasuredHeight } from '../canvas/measuredCache';
import type { PanelFlowNode } from './panelTypes';

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
        if (mode === 'visualize' && kind === 'problem') {
          return layoutVisualizeCanvas(mapped as PanelFlowNode[], layoutVisualizeOptions());
        }
        return mapped;
      });
    };
    const ro = new ResizeObserver(() => requestAnimationFrame(sync));
    ro.observe(el);
    sync();
    return () => ro.disconnect();
  }, [collapsed, enabled, id, kind, layoutVisualizeOptions, mode, setNodes]);

  return panelRef;
}
