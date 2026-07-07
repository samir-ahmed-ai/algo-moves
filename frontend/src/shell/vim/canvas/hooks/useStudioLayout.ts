import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import {
  buildStudioLayout,
  computeResponsiveStudioMetrics,
  defaultResponsiveStudioMetrics,
} from '../layout/studioLayout';
import { HUD_NODE_ID, HUD_SLOT, MAZE_NODE_ID } from '../layout/orbitSlots';
import { STUDIO_REFERENCE_VIEWPORT_W, resolveStudioChrome } from '../layout/studioFit';
import { computeMazeFillCellSize, MAZE_NODE_CHROME } from '../layout/mazeMetrics';
import type { MazeGrid } from '../../engine';

const RESIZE_DEBOUNCE_MS = 100;

function measureFlowNode(id: string): { w: number; h: number } | null {
  const root = document.querySelector(`.react-flow__node[data-id="${id}"]`);
  const inner = root?.firstElementChild as HTMLElement | null;
  if (!inner) return null;
  return {
    w: Math.ceil(Math.max(inner.offsetWidth, inner.scrollWidth)),
    h: Math.ceil(Math.max(inner.offsetHeight, inner.scrollHeight)),
  };
}

function readContainerSize(el: HTMLElement | null): { w: number; h: number } {
  if (!el) return { w: 0, h: 0 };
  return { w: el.clientWidth, h: el.clientHeight };
}

function readViewportWidth(): number {
  return typeof window !== 'undefined' ? window.innerWidth : STUDIO_REFERENCE_VIEWPORT_W;
}

function buildInitialLayout() {
  const metrics = defaultResponsiveStudioMetrics();
  return buildStudioLayout({
    mazeW: metrics.mazeW,
    mazeH: metrics.mazeH,
    hudW: metrics.hudW,
    hudH: HUD_SLOT.height,
  });
}

export function useStudioLayout(grid: MazeGrid, containerRef: React.RefObject<HTMLElement | null>) {
  const [containerSize, setContainerSize] = useState(() => readContainerSize(containerRef.current));
  const [viewportWidth, setViewportWidth] = useState(readViewportWidth);
  const [hudHeight, setHudHeight] = useState<number>(HUD_SLOT.height);
  const initialLayout = useMemo(() => buildInitialLayout(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialLayout.edges);
  const { setViewport } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  const chrome = useMemo(() => resolveStudioChrome(viewportWidth), [viewportWidth]);

  const layoutMetrics = useMemo(() => {
    const { w, h } = containerSize;
    if (w > 0 && h > 0) {
      return computeResponsiveStudioMetrics(w, h, hudHeight, viewportWidth);
    }
    return defaultResponsiveStudioMetrics(hudHeight);
  }, [containerSize, hudHeight, viewportWidth]);

  const cellSize = useMemo(() => {
    const mazeInnerW = layoutMetrics.mazeW - MAZE_NODE_CHROME.padX;
    const mazeInnerH =
      layoutMetrics.mazeH -
      MAZE_NODE_CHROME.padTop -
      MAZE_NODE_CHROME.title -
      MAZE_NODE_CHROME.padBottom;
    return computeMazeFillCellSize(grid, mazeInnerW, mazeInnerH);
  }, [grid, layoutMetrics]);

  const layoutKey = `${layoutMetrics.availW}x${layoutMetrics.availH}:${cellSize}:${hudHeight}:${viewportWidth}`;

  const snapViewport = useCallback(async () => {
    await setViewport({ x: chrome.x, y: chrome.top, zoom: 1 }, { duration: 0 });
  }, [chrome.x, chrome.top, setViewport]);

  useEffect(() => {
    const layout = buildStudioLayout({
      mazeW: layoutMetrics.mazeW,
      mazeH: layoutMetrics.mazeH,
      hudW: layoutMetrics.hudW,
      hudH: hudHeight,
    });
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [layoutKey, layoutMetrics, hudHeight, setEdges, setNodes]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;
    const updateSize = (width: number, height: number) => {
      setContainerSize((prev) => {
        if (prev.w === width && prev.h === height) return prev;
        return { w: width, h: height };
      });
    };

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        updateSize(Math.round(entry.contentRect.width), Math.round(entry.contentRect.height));
      }, RESIZE_DEBOUNCE_MS);
    });

    ro.observe(el);
    updateSize(el.clientWidth, el.clientHeight);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [containerRef]);

  useEffect(() => {
    if (!nodesInitialized || !nodes.length) return;

    const id = requestAnimationFrame(() => {
      const measured = measureFlowNode(HUD_NODE_ID);
      if (measured && Math.abs(measured.h - hudHeight) >= 2) {
        setHudHeight(measured.h);
      }
      void snapViewport();
    });

    return () => cancelAnimationFrame(id);
  }, [nodesInitialized, layoutKey, nodes.length, hudHeight, snapViewport]);

  return { nodes, edges, onNodesChange, onEdgesChange, cellSize };
}

export { MAZE_NODE_ID };
