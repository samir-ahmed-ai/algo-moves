import { useLayoutEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useWorkspace } from '../../../lib/workspace';
import { useCanvasActions } from '../CanvasContext';
import { layoutEstimate, layoutVisualizeCanvas } from '../layout';
import { setMeasuredHeight } from '../measuredCache';
import type { PanelFlowNode } from './panelTypes';

const FIT_MIN_H = 150;
const FIT_MIN_H_EXAMPLES = 90;

function fitMinHeight(kind: string): number {
  return kind === 'examples' ? FIT_MIN_H_EXAMPLES : FIT_MIN_H;
}

export function useFitContentSize(id: string, kind: string, collapsed: boolean, fitWidth: boolean, enabled: boolean) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { setNodes } = useReactFlow();
  const { mode } = useWorkspace();
  const { layoutVisualizeOptions } = useCanvasActions();
  const minW = layoutEstimate(kind).w;

  useLayoutEffect(() => {
    if (collapsed || !enabled) return;
    const el = panelRef.current;
    if (!el) return;
    const sync = () => {
      const measuredW = Math.ceil(Math.max(el.scrollWidth, el.offsetWidth));
      const measuredH = Math.ceil(Math.max(el.scrollHeight, el.offsetHeight));
      const w = Math.max(minW, measuredW);
      const h = Math.max(fitMinHeight(kind), measuredH);
      setMeasuredHeight(id, h);
      setNodes((nds) => {
        let changed = false;
        const mapped = nds.map((n) => {
          if (n.id !== id) return n;
          const curW = n.width ?? 0;
          const curH = n.height ?? 0;
          const widthOk = !fitWidth || Math.abs(curW - w) < 2;
          const heightOk = Math.abs(curH - h) < 2;
          if (widthOk && heightOk) return n;
          changed = true;
          return {
            ...n,
            ...(fitWidth && !widthOk ? { width: w } : {}),
            ...(!heightOk ? { height: h } : {}),
          };
        });
        if (!changed) return nds;
        if (mode === 'visualize' && (kind === 'examples' || kind === 'problem')) {
          return layoutVisualizeCanvas(mapped as PanelFlowNode[], layoutVisualizeOptions());
        }
        return mapped;
      });
    };
    const ro = new ResizeObserver(() => requestAnimationFrame(sync));
    ro.observe(el);
    sync();
    return () => ro.disconnect();
  }, [collapsed, enabled, fitWidth, id, kind, layoutVisualizeOptions, minW, mode, setNodes]);

  return panelRef;
}
