import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import { buildStudioLayout, STUDIO_HUD_WIDTH, STUDIO_MAZE_HEIGHT } from '../layout/studioLayout';
import { HUD_NODE_ID, MAZE_NODE_ID, HUD_SLOT, ORBIT_V_GAP } from '../layout/orbitSlots';
import {
  computeMazeFillCellSize,
  MAZE_NODE_CHROME,
} from '../layout/mazeMetrics';
import type { MazeGrid } from '../../engine';

const FIT_PADDING = 0;
/** Allow fitView to scale the studio up on large full-page viewports. */
const FIT_MAX_ZOOM = 2.5;
const STUDIO_NODE_IDS = [{ id: HUD_NODE_ID }, { id: MAZE_NODE_ID }];

/** Maze inner area in flow-space coordinates (fixed for all levels/viewports). */
const MAZE_INNER_W = STUDIO_HUD_WIDTH - MAZE_NODE_CHROME.padX;
const MAZE_INNER_H =
  STUDIO_MAZE_HEIGHT - MAZE_NODE_CHROME.padTop - MAZE_NODE_CHROME.title - MAZE_NODE_CHROME.padBottom;

function buildFillLayout() {
  return buildStudioLayout({
    mazeW: STUDIO_HUD_WIDTH,
    mazeH: STUDIO_MAZE_HEIGHT,
    hudW: HUD_SLOT.width,
    hudH: HUD_SLOT.height,
  });
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
  const initial = buildFillLayout();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const didInitialFit = useRef(false);

  // Cell size is fixed per level — it fills the maze inner area in flow coordinates.
  // fitView then scales the whole canvas to the actual container.
  const cellSize = useMemo(
    () => computeMazeFillCellSize(grid, MAZE_INNER_W, MAZE_INNER_H),
    [grid],
  );

  // mazeLayoutKey changes when the active level changes (different grid → different cellSize).
  const mazeLayoutKey = String(cellSize);

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

  // Keep only HUD height measured — maze is explicitly fill-sized so it won't drift.
  const syncMeasuredNodes = useCallback(() => {
    setNodes((nds) => {
      let changed = false;
      const next = nds.map((n) => {
        if (n.id === MAZE_NODE_ID) return n; // maze is fill-sized, skip measurement
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
        const mazeY = hud.position.y + (hud.height ?? HUD_SLOT.height) + ORBIT_V_GAP;
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
    const layout = buildFillLayout();
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [setNodes, setEdges]);

  useEffect(() => {
    relayout();
  }, [relayout]);

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
