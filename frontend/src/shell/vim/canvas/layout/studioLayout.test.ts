import { describe, it, expect } from 'vitest';
import {
  buildStudioLayout,
  computeResponsiveStudioMetrics,
  LAYOUT_CANVAS_H,
  LAYOUT_CANVAS_W,
  STUDIO_HUD_WIDTH,
  STUDIO_INSET_BOTTOM,
  STUDIO_INSET_TOP,
  STUDIO_MAZE_HEIGHT,
} from './studioLayout';
import { resolveStudioChrome } from './studioFit';
import {
  HUD_NODE_ID,
  HUD_SLOT,
  HUD_TARGET_HANDLE,
  MAZE_HUD_SOURCE_HANDLE,
  MAZE_NODE_ID,
  ORBIT_V_GAP,
  STUDIO_INSET_X,
} from './orbitSlots';

describe('computeResponsiveStudioMetrics', () => {
  it('fills the usable container area between chrome gutters', () => {
    const chrome = resolveStudioChrome(1280);
    const metrics = computeResponsiveStudioMetrics(900, 800, 176, 1280);
    expect(metrics.availW).toBe(900 - chrome.x * 2);
    expect(metrics.availH).toBe(800 - chrome.top - chrome.bottom);
    expect(metrics.hudW).toBe(metrics.availW - 2 * STUDIO_INSET_X);
    expect(metrics.mazeW).toBe(metrics.hudW);
    expect(metrics.mazeH).toBe(
      metrics.availH - STUDIO_INSET_TOP - STUDIO_INSET_BOTTOM - 176 - ORBIT_V_GAP,
    );
  });

  it('uses larger bottom chrome on phones for the keyboard HUD', () => {
    const desktop = computeResponsiveStudioMetrics(900, 800, 176, 1280);
    const phone = computeResponsiveStudioMetrics(390, 640, 280, 390);
    const phoneChrome = resolveStudioChrome(390);
    expect(phone.availH).toBe(640 - phoneChrome.top - phoneChrome.bottom);
    expect(phone.mazeH).toBeLessThan(desktop.mazeH);
  });

  it('shrinks when the parent container shrinks', () => {
    const large = computeResponsiveStudioMetrics(900, 800, 176, 1280);
    const small = computeResponsiveStudioMetrics(640, 560, 176, 640);
    expect(small.availW).toBeLessThan(large.availW);
    expect(small.availH).toBeLessThan(large.availH);
    expect(small.mazeH).toBeLessThan(large.mazeH);
  });
});

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
    expect(bottom + STUDIO_INSET_BOTTOM).toBe(LAYOUT_CANVAS_H);
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
