import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import { buildStudioLayout } from '../layout/studioLayout';
import { HUD_NODE_ID, MAZE_NODE_ID, HUD_SLOT, ORBIT_TOP_EXTRA_GAP, ORBIT_V_GAP } from '../layout/orbitSlots';
import {
  computeStudioCellSize,
  MAZE_CELL_SIZE,
  mazeNodeSize,
} from '../layout/mazeMetrics';
import type { MazeGrid } from '../../engine';

const FIT_PADDING = 0.12;
/** Allow fitView to scale the studio up on large full-page viewports. */
const FIT_MAX_ZOOM = 2.5;
const STUDIO_NODE_IDS = [{ id: HUD_NODE_ID }, { id: MAZE_NODE_ID }];

function layoutForGrid(grid: MazeGrid, cellSize: number) {
  const { w: mazeW, h: mazeH } = mazeNodeSize(grid, cellSize);
  return buildStudioLayout({ mazeW, mazeH, hudW: HUD_SLOT.width, hudH: HUD_SLOT.height });
}

function measureFlowNode(id: string): { w: number; h: number } | null {
  const root = document.querySelector(`.react-flow__node[data-id="${id}"]`);
  const inner = root?.firstElementChild as HTMLElement | null;
  if (!inner) return null;
  return {
    w: Math.ceil(Math.max(inner.offsetWidth, inner.scrollWidth)),
    h: Math.ceil(Math.max(inner.offsetHeight, inner.scrollHeight)),
  };
}

export function useStudioLayout(grid: MazeGrid, containerRef: React.RefObject<HTMLElement | null>) {
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const initialCell = computeStudioCellSize(grid, 1280, 900);
  const initial = layoutForGrid(grid, initialCell);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const didInitialFit = useRef(false);

  const cellSize = useMemo(() => {
    if (containerSize.w <= 0 || containerSize.h <= 0) return MAZE_CELL_SIZE;
    return computeStudioCellSize(grid, containerSize.w, containerSize.h, {
      hudW: HUD_SLOT.width,
      hudH: HUD_SLOT.height,
      gap: ORBIT_V_GAP,
      pad: FIT_PADDING,
    });
  }, [grid, containerSize.w, containerSize.h]);

  const mazeLayoutKey = useMemo(() => {
    const { w, h } = mazeNodeSize(grid, cellSize);
    return `${cellSize}:${w}x${h}`;
  }, [grid, cellSize]);

  const fitCanvas = useCallback(
    (duration = 200) => {
      fitView({
        nodes: STUDIO_NODE_IDS,
        padding: FIT_PADDING,
        duration,
        maxZoom: FIT_MAX_ZOOM,
      });
    },
    [fitView],
  );

  const syncMeasuredNodes = useCallback(() => {
    setNodes((nds) => {
      let changed = false;
      const next = nds.map((n) => {
        const measured = measureFlowNode(n.id);
        if (!measured) return n;
        const widthOk = n.width == null || Math.abs((n.width ?? 0) - measured.w) < 2;
        const heightOk = n.height == null || Math.abs((n.height ?? 0) - measured.h) < 2;
        if (widthOk && heightOk) return n;
        changed = true;
        return { ...n, width: measured.w, height: measured.h };
      });

      const hud = next.find((n) => n.id === HUD_NODE_ID);
      const maze = next.find((n) => n.id === MAZE_NODE_ID);
      if (hud && maze) {
        const mazeY = hud.position.y + (hud.height ?? HUD_SLOT.height) + ORBIT_V_GAP + ORBIT_TOP_EXTRA_GAP;
        if (Math.abs(maze.position.y - mazeY) > 1) {
          changed = true;
          return next.map((n) =>
            n.id === MAZE_NODE_ID ? { ...n, position: { ...n.position, y: mazeY } } : n,
          );
        }
      }

      return changed ? next : nds;
    });
  }, [setNodes]);

  const relayout = useCallback(() => {
    const layout = layoutForGrid(grid, cellSize);
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [grid, cellSize, setNodes, setEdges]);

  useEffect(() => {
    relayout();
  }, [relayout]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [containerRef]);

  useEffect(() => {
    if (!nodesInitialized || !nodes.length) return;
    const id = requestAnimationFrame(() => syncMeasuredNodes());
    return () => cancelAnimationFrame(id);
  }, [nodesInitialized, mazeLayoutKey, nodes.length, syncMeasuredNodes]);

  const nodesSig = nodes.map((n) => `${n.id}:${n.width ?? 0}x${n.height ?? 0}`).join('|');
  useEffect(() => {
    if (!nodesInitialized || !nodes.length) return;
    const id = requestAnimationFrame(() => fitCanvas(didInitialFit.current ? 200 : 0));
    didInitialFit.current = true;
    return () => cancelAnimationFrame(id);
  }, [nodesInitialized, mazeLayoutKey, nodesSig, fitCanvas, nodes.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        syncMeasuredNodes();
        fitCanvas();
      }, 150);
    });
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [containerRef, fitCanvas, syncMeasuredNodes]);

  return { nodes, edges, onNodesChange, onEdgesChange, cellSize };
}

export { MAZE_NODE_ID };
