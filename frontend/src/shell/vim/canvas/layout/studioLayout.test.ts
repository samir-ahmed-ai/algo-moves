import { describe, it, expect } from 'vitest';
import {
  buildStudioLayout,
  LAYOUT_CANVAS_W,
  STUDIO_HUD_WIDTH,
  STUDIO_INSET_BOTTOM,
  STUDIO_INSET_TOP,
  STUDIO_MAZE_HEIGHT,
} from './studioLayout';
import {
  HUD_NODE_ID,
  HUD_SLOT,
  HUD_TARGET_HANDLE,
  MAZE_HUD_SOURCE_HANDLE,
  MAZE_NODE_ID,
  ORBIT_V_GAP,
  STUDIO_INSET_X,
} from './orbitSlots';

describe('buildStudioLayout', () => {
  it('creates hud and maze nodes with one edge', () => {
    const mazeW = STUDIO_HUD_WIDTH;
    const mazeH = STUDIO_MAZE_HEIGHT;
    const { nodes, edges } = buildStudioLayout({ mazeW, mazeH });

    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(nodes.some((n) => n.id === HUD_NODE_ID)).toBe(true);
    expect(nodes.some((n) => n.id === MAZE_NODE_ID)).toBe(true);
  });

  it('places hud at top-left inset and maze directly below', () => {
    const mazeW = STUDIO_HUD_WIDTH;
    const mazeH = STUDIO_MAZE_HEIGHT;
    const hudW = HUD_SLOT.width;
    const hudH = HUD_SLOT.height;

    const { nodes } = buildStudioLayout({ mazeW, mazeH, hudW, hudH });
    const hud = nodes.find((n) => n.id === HUD_NODE_ID)!;
    const maze = nodes.find((n) => n.id === MAZE_NODE_ID)!;

    expect(hud.position.x).toBe(STUDIO_INSET_X);
    expect(hud.position.y).toBe(STUDIO_INSET_TOP);
    expect(maze.position.x).toBe(STUDIO_INSET_X);
    expect(maze.position.y).toBe(STUDIO_INSET_TOP + hudH + ORBIT_V_GAP);
  });

  it('hud and maze share the same left edge', () => {
    const { nodes } = buildStudioLayout({ mazeW: STUDIO_HUD_WIDTH, mazeH: STUDIO_MAZE_HEIGHT });
    const hud = nodes.find((n) => n.id === HUD_NODE_ID)!;
    const maze = nodes.find((n) => n.id === MAZE_NODE_ID)!;
    expect(hud.position.x).toBe(maze.position.x);
  });

  it('hud is full studio width', () => {
    const { nodes } = buildStudioLayout({ mazeW: STUDIO_HUD_WIDTH, mazeH: STUDIO_MAZE_HEIGHT });
    const hud = nodes.find((n) => n.id === HUD_NODE_ID)!;
    expect(hud.width).toBe(STUDIO_HUD_WIDTH);
    expect(hud.width).toBe(LAYOUT_CANVAS_W - 2 * STUDIO_INSET_X);
  });

  it('maze fills remaining canvas height', () => {
    const { nodes } = buildStudioLayout({ mazeW: STUDIO_HUD_WIDTH, mazeH: STUDIO_MAZE_HEIGHT });
    const maze = nodes.find((n) => n.id === MAZE_NODE_ID)!;
    expect(maze.height).toBe(STUDIO_MAZE_HEIGHT);
  });

  it('maze is taller than the hud', () => {
    const { nodes } = buildStudioLayout({ mazeW: STUDIO_HUD_WIDTH, mazeH: STUDIO_MAZE_HEIGHT });
    const hud = nodes.find((n) => n.id === HUD_NODE_ID)!;
    const maze = nodes.find((n) => n.id === MAZE_NODE_ID)!;
    expect(maze.height!).toBeGreaterThan(hud.height!);
  });

  it('layout constants fill the virtual canvas exactly', () => {
    // All inset heights should sum to LAYOUT_CANVAS_H
    const { nodes } = buildStudioLayout({ mazeW: STUDIO_HUD_WIDTH, mazeH: STUDIO_MAZE_HEIGHT });
    const hud = nodes.find((n) => n.id === HUD_NODE_ID)!;
    const maze = nodes.find((n) => n.id === MAZE_NODE_ID)!;
    const bottom = maze.position.y + (maze.height ?? STUDIO_MAZE_HEIGHT);
    expect(bottom + STUDIO_INSET_BOTTOM).toBe(900); // LAYOUT_CANVAS_H
    expect(hud.position.y).toBe(STUDIO_INSET_TOP);
  });

  it('connects hud bottom to maze top', () => {
    const { edges } = buildStudioLayout({ mazeW: STUDIO_HUD_WIDTH, mazeH: STUDIO_MAZE_HEIGHT });
    const edge = edges[0]!;

    expect(edge.source).toBe(HUD_NODE_ID);
    expect(edge.sourceHandle).toBe(MAZE_HUD_SOURCE_HANDLE);
    expect(edge.target).toBe(MAZE_NODE_ID);
    expect(edge.targetHandle).toBe(HUD_TARGET_HANDLE);
  });
});
