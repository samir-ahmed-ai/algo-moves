/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildToolDockSections,
  clampDockPosition,
  countToolDockItems,
  DEFAULT_TOOL_DOCK_PREFS,
  filterToolDockSections,
  readToolDockPrefs,
  shouldShowToolDock,
  TOOL_DOCK_STORAGE_KEY,
  toolDockLockState,
  writeToolDockPrefs,
} from './toolDock';

describe('shouldShowToolDock', () => {
  const base = {
    present: false,
    mode: 'visualize' as const,
    hasItems: true,
    problemBound: false,
    sessionActive: false,
  };

  it('shows on a standalone visualize canvas', () => {
    expect(shouldShowToolDock(base)).toBe(true);
  });

  it('hides in present mode', () => {
    expect(shouldShowToolDock({ ...base, present: true })).toBe(false);
  });

  it('hides outside visualize mode', () => {
    expect(shouldShowToolDock({ ...base, mode: 'learn' })).toBe(false);
  });

  it('hides when there is nothing to add', () => {
    expect(shouldShowToolDock({ ...base, hasItems: false })).toBe(false);
  });

  it('hides on problem-bound canvases without a session', () => {
    expect(shouldShowToolDock({ ...base, problemBound: true })).toBe(false);
  });

  it('shows on problem-bound canvases when a session is active', () => {
    expect(shouldShowToolDock({ ...base, problemBound: true, sessionActive: true })).toBe(true);
  });
});

describe('toolDockLockState', () => {
  it('never locks outside interview sessions', () => {
    expect(
      toolDockLockState({
        sessionKind: 'collab',
        isHost: false,
        runtimeLocked: true,
        guestCanMoveNodes: false,
      }).locked,
    ).toBe(false);
  });

  it('never locks the host', () => {
    expect(
      toolDockLockState({
        sessionKind: 'interview',
        isHost: true,
        runtimeLocked: true,
        guestCanMoveNodes: false,
      }).locked,
    ).toBe(false);
  });

  it('locks candidates when the board is locked', () => {
    const state = toolDockLockState({
      sessionKind: 'interview',
      isHost: false,
      runtimeLocked: true,
      guestCanMoveNodes: true,
    });
    expect(state.locked).toBe(true);
    expect(state.hint).toMatch(/locked/i);
  });

  it('locks candidates who may not move nodes (including undefined default)', () => {
    for (const guestCanMoveNodes of [false, undefined]) {
      const state = toolDockLockState({
        sessionKind: 'interview',
        isHost: false,
        runtimeLocked: false,
        guestCanMoveNodes,
      });
      expect(state.locked).toBe(true);
      expect(state.hint).toMatch(/host/i);
    }
  });

  it('unlocks candidates who may move nodes on an unlocked board', () => {
    expect(
      toolDockLockState({
        sessionKind: 'interview',
        isHost: false,
        runtimeLocked: false,
        guestCanMoveNodes: true,
      }).locked,
    ).toBe(false);
  });
});

describe('buildToolDockSections', () => {
  const kinds = [
    { id: 'whiteboard', title: 'Whiteboard' },
    { id: 'notes', title: 'Notes' },
    { id: 'collab-code', title: 'Collab Code Studio' },
    { id: 'viz', title: 'Visualization' },
  ];
  const effects = [{ id: 'fast', title: 'Fast' }];

  it('groups kinds into Boards/Code/Notes/Panels and appends Effects', () => {
    const sections = buildToolDockSections(kinds, effects);
    expect(sections.map((s) => s.label)).toEqual(['Boards', 'Code', 'Notes', 'Panels', 'Effects']);
    expect(sections[0]!.items[0]!.id).toBe('whiteboard');
    expect(sections[3]!.items[0]!.id).toBe('viz');
    expect(sections[4]!.items[0]!).toMatchObject({ id: 'fast', type: 'effect', multi: true });
  });

  it('marks multi-instance kinds', () => {
    const sections = buildToolDockSections(kinds, []);
    const byId = new Map(sections.flatMap((s) => s.items).map((i) => [i.id, i]));
    expect(byId.get('whiteboard')?.multi).toBe(true);
    expect(byId.get('collab-code')?.multi).toBe(true);
    expect(byId.get('notes')?.multi).toBe(false);
  });

  it('drops empty sections', () => {
    const sections = buildToolDockSections([{ id: 'notes', title: 'Notes' }], []);
    expect(sections.map((s) => s.label)).toEqual(['Notes']);
    expect(countToolDockItems(sections)).toBe(1);
  });
});

describe('filterToolDockSections', () => {
  const sections = buildToolDockSections(
    [
      { id: 'whiteboard', title: 'Whiteboard' },
      { id: 'notes', title: 'Notes' },
    ],
    [{ id: 'fast', title: 'Fast' }],
  );

  it('passes everything through on a blank query', () => {
    expect(filterToolDockSections(sections, '  ')).toBe(sections);
  });

  it('filters items by title, dropping emptied sections', () => {
    const filtered = filterToolDockSections(sections, 'white');
    expect(filtered.map((s) => s.label)).toEqual(['Boards']);
  });

  it('matches item hints too', () => {
    const filtered = filterToolDockSections(sections, 'playback');
    expect(filtered.map((s) => s.label)).toEqual(['Effects']);
  });
});

describe('clampDockPosition', () => {
  const container = { width: 1000, height: 600 };
  const size = { width: 200, height: 300 };

  it('keeps in-bounds positions untouched', () => {
    expect(clampDockPosition({ x: 50, y: 60 }, container, size)).toEqual({ x: 50, y: 60 });
  });

  it('clamps to the margin on the near edges', () => {
    expect(clampDockPosition({ x: -40, y: -10 }, container, size)).toEqual({ x: 8, y: 8 });
  });

  it('clamps to container minus size on the far edges', () => {
    expect(clampDockPosition({ x: 5000, y: 5000 }, container, size)).toEqual({ x: 792, y: 292 });
  });

  it('never collapses below the margin for oversized docks', () => {
    expect(clampDockPosition({ x: 100, y: 100 }, { width: 100, height: 100 }, size)).toEqual({
      x: 8,
      y: 8,
    });
  });
});

describe('tool dock prefs persistence', () => {
  beforeEach(() => localStorage.removeItem(TOOL_DOCK_STORAGE_KEY));

  it('falls back to defaults when unset or invalid', () => {
    expect(readToolDockPrefs()).toEqual(DEFAULT_TOOL_DOCK_PREFS);
    localStorage.setItem(TOOL_DOCK_STORAGE_KEY, '{"pos":"nope"}');
    expect(readToolDockPrefs()).toEqual(DEFAULT_TOOL_DOCK_PREFS);
  });

  it('round-trips position and collapsed state', () => {
    writeToolDockPrefs({ pos: { x: 42, y: 24 }, collapsed: true });
    expect(readToolDockPrefs()).toEqual({ pos: { x: 42, y: 24 }, collapsed: true });
  });
});
