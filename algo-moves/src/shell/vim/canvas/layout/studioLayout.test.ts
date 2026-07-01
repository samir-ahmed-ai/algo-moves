import { describe, it, expect } from 'vitest';
import { buildStudioLayout, LAYOUT_CANVAS_H, LAYOUT_CANVAS_W } from './studioLayout';
import {
  HUD_NODE_ID,
  HUD_SLOT,
  HUD_TARGET_HANDLE,
  MAZE_HUD_SOURCE_HANDLE,
  MAZE_NODE_ID,
  ORBIT_V_GAP,
} from './orbitSlots';

describe('buildStudioLayout', () => {
  it('creates hud and maze nodes with one edge', () => {
    const mazeW = 200;
    const mazeH = 180;
    const { nodes, edges } = buildStudioLayout({ mazeW, mazeH });

    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(nodes.some((n) => n.id === HUD_NODE_ID)).toBe(true);
    expect(nodes.some((n) => n.id === MAZE_NODE_ID)).toBe(true);
  });

  it('places hud centered above maze', () => {
    const mazeW = 200;
    const mazeH = 180;
    const cx = LAYOUT_CANVAS_W / 2;
    const cy = LAYOUT_CANVAS_H / 2;
    const hudW = HUD_SLOT.width;
    const hudH = HUD_SLOT.height;

    const { nodes } = buildStudioLayout({ mazeW, mazeH, hudW, hudH });
    const hud = nodes.find((n) => n.id === HUD_NODE_ID)!;
    const maze = nodes.find((n) => n.id === MAZE_NODE_ID)!;

    const stackH = hudH + ORBIT_V_GAP + mazeH;
    const stackTop = cy - stackH / 2;

    expect(hud.position.x).toBe(cx - hudW / 2);
    expect(hud.position.y).toBe(stackTop);
    expect(maze.position.x).toBe(cx - mazeW / 2);
    expect(maze.position.y).toBe(stackTop + hudH + ORBIT_V_GAP);
    expect(hud.position.y + hudH + ORBIT_V_GAP).toBe(maze.position.y);
  });

  it('connects hud bottom to maze top', () => {
    const { edges } = buildStudioLayout({ mazeW: 220, mazeH: 200 });
    const edge = edges[0]!;

    expect(edge.source).toBe(HUD_NODE_ID);
    expect(edge.sourceHandle).toBe(MAZE_HUD_SOURCE_HANDLE);
    expect(edge.target).toBe(MAZE_NODE_ID);
    expect(edge.targetHandle).toBe(HUD_TARGET_HANDLE);
  });
});
