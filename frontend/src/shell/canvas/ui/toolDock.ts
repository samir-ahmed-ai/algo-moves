import type { CanvasMode } from '@/core';
import type { SessionKind } from '@/lib/session';
import { readStorageJson, writeStorageJson } from '@/store/persistence/storage';
import { isMultiInstancePanel } from '../layout/layoutPresets';

/** localStorage key for the Tool Dock position + collapsed state. */
export const TOOL_DOCK_STORAGE_KEY = 'algomoves:toolDock';

export interface ToolDockPrefs {
  /** Absolute offset inside the canvas pane; null = default top-left slot. */
  pos: { x: number; y: number } | null;
  collapsed: boolean;
}

export const DEFAULT_TOOL_DOCK_PREFS: ToolDockPrefs = { pos: null, collapsed: false };
export const TOOL_DOCK_MARGIN_PX = 8;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isToolDockPrefs(value: unknown): value is ToolDockPrefs {
  const p = value as Partial<ToolDockPrefs> | null;
  if (!p || typeof p !== 'object' || typeof p.collapsed !== 'boolean') return false;
  if (p.pos === null) return true;
  return !!p.pos && isFiniteNumber(p.pos.x) && isFiniteNumber(p.pos.y);
}

export function readToolDockPrefs(): ToolDockPrefs {
  return readStorageJson(TOOL_DOCK_STORAGE_KEY, DEFAULT_TOOL_DOCK_PREFS, isToolDockPrefs);
}

export function writeToolDockPrefs(prefs: ToolDockPrefs): void {
  writeStorageJson(TOOL_DOCK_STORAGE_KEY, prefs);
}

/** Keep the dock fully inside its container, with a small margin. */
export function clampDockPosition(
  pos: { x: number; y: number },
  container: { width: number; height: number },
  size: { width: number; height: number },
  margin = TOOL_DOCK_MARGIN_PX,
): { x: number; y: number } {
  const safeMargin = Number.isFinite(margin) ? Math.max(0, margin) : TOOL_DOCK_MARGIN_PX;
  const safeContainer = {
    width: Math.max(0, Number.isFinite(container.width) ? container.width : 0),
    height: Math.max(0, Number.isFinite(container.height) ? container.height : 0),
  };
  const safeSize = {
    width: Math.max(0, Number.isFinite(size.width) ? size.width : 0),
    height: Math.max(0, Number.isFinite(size.height) ? size.height : 0),
  };
  const safePos = {
    x: Number.isFinite(pos.x) ? pos.x : safeMargin,
    y: Number.isFinite(pos.y) ? pos.y : safeMargin,
  };
  const maxX = Math.max(safeMargin, safeContainer.width - safeSize.width - safeMargin);
  const maxY = Math.max(safeMargin, safeContainer.height - safeSize.height - safeMargin);
  return {
    x: Math.min(Math.max(safePos.x, safeMargin), maxX),
    y: Math.min(Math.max(safePos.y, safeMargin), maxY),
  };
}

/**
 * Dock visibility: any standalone visualize canvas, or a problem-bound canvas
 * while a collab/interview session is live. Never in present mode.
 */
export function shouldShowToolDock(input: {
  present: boolean;
  mode: CanvasMode;
  hasItems: boolean;
  problemBound: boolean;
  sessionActive: boolean;
}): boolean {
  if (input.present || input.mode !== 'visualize' || !input.hasItems) return false;
  return !input.problemBound || input.sessionActive;
}

export interface ToolDockLockState {
  locked: boolean;
  hint: string | null;
}

/** Candidates in a locked (or move-restricted) interview see disabled items, not a hidden dock. */
export function toolDockLockState(input: {
  sessionKind: SessionKind;
  isHost: boolean;
  runtimeLocked: boolean;
  guestCanMoveNodes: boolean | undefined;
}): ToolDockLockState {
  if (input.sessionKind !== 'interview' || input.isHost) return { locked: false, hint: null };
  if (input.runtimeLocked) return { locked: true, hint: 'Board locked by the host' };
  if (input.guestCanMoveNodes !== true) {
    return { locked: true, hint: 'Host controls panel placement' };
  }
  return { locked: false, hint: null };
}

export interface ToolDockItem {
  id: string;
  title: string;
  hint?: string;
  type: 'kind' | 'effect';
  multi: boolean;
}

export interface ToolDockSection {
  id: string;
  label: string;
  items: ToolDockItem[];
}

const KIND_HINTS: Record<string, string> = {
  whiteboard: 'Shared freehand sketching',
  'collab-code': 'Live multiplayer code editor',
  notes: 'Quick markdown scratchpad',
};

const KIND_SECTIONS: { id: string; label: string; kinds: Set<string> }[] = [
  { id: 'boards', label: 'Boards', kinds: new Set(['whiteboard']) },
  { id: 'code', label: 'Code', kinds: new Set(['collab-code']) },
  { id: 'notes', label: 'Notes', kinds: new Set(['notes']) },
];

/** Group the canvasAdd contract into dock sections; empty sections are dropped. */
export function buildToolDockSections(
  kinds: { id: string; title: string }[],
  effects: { id: string; title: string }[],
): ToolDockSection[] {
  const kindItem = (k: { id: string; title: string }): ToolDockItem => {
    const hint = KIND_HINTS[k.id];
    return {
      id: k.id,
      title: k.title,
      type: 'kind',
      multi: isMultiInstancePanel(k.id),
      ...(hint ? { hint } : {}),
    };
  };
  const sections: ToolDockSection[] = KIND_SECTIONS.map((s) => ({
    id: s.id,
    label: s.label,
    items: kinds.filter((k) => s.kinds.has(k.id)).map(kindItem),
  }));
  const claimed = new Set(KIND_SECTIONS.flatMap((s) => [...s.kinds]));
  sections.push({
    id: 'panels',
    label: 'Panels',
    items: kinds.filter((k) => !claimed.has(k.id)).map(kindItem),
  });
  sections.push({
    id: 'effects',
    label: 'Effects',
    items: effects.map((e) => ({
      id: e.id,
      title: e.title,
      hint: 'Playback effect',
      type: 'effect' as const,
      multi: true,
    })),
  });
  return sections.filter((s) => s.items.length > 0);
}

export function countToolDockItems(sections: ToolDockSection[]): number {
  return sections.reduce((n, s) => n + s.items.length, 0);
}

/** Case-insensitive title/hint filter; blank queries pass everything through. */
export function filterToolDockSections(
  sections: ToolDockSection[],
  query: string,
): ToolDockSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return sections;
  return sections
    .map((s) => ({
      ...s,
      items: s.items.filter(
        (i) => i.title.toLowerCase().includes(q) || (i.hint?.toLowerCase().includes(q) ?? false),
      ),
    }))
    .filter((s) => s.items.length > 0);
}
