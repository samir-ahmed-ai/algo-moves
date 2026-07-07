import { create } from 'zustand';
import type { Edge } from '@xyflow/react';
import type { PanelFlowNode } from '@/core/panelFlowTypes';

export type CanvasHistorySnapshot = {
  readonly nodes: readonly PanelFlowNode[];
  readonly edges: readonly Edge[];
};

type KeyStack = {
  history: CanvasHistorySnapshot[];
  index: number;
  lastSig: string;
};

const MAX_ENTRIES = 60;

function emptyStack(): KeyStack {
  return { history: [], index: -1, lastSig: '' };
}

function normalizeHistoryKey(key: string): string | null {
  const next = key.trim();
  return next ? next : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneSnapshot(snapshot: CanvasHistorySnapshot): { nodes: PanelFlowNode[]; edges: Edge[] } {
  return {
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      data: isRecord(node.data) ? { ...node.data } : node.data,
    })),
    edges: snapshot.edges.map((edge) => {
      const cloned = { ...edge };
      if (isRecord(edge.data)) cloned.data = { ...edge.data };
      return cloned;
    }),
  };
}

interface CanvasHistoryState {
  stacks: Record<string, KeyStack>;
  record: (
    key: string,
    sig: string,
    nodes: readonly PanelFlowNode[],
    edges: readonly Edge[],
  ) => boolean;
  undo: (key: string) => CanvasHistorySnapshot | null;
  redo: (key: string) => CanvasHistorySnapshot | null;
  reset: (key: string, lastSig?: string) => void;
  canUndo: (key: string) => boolean;
  canRedo: (key: string) => boolean;
  indexOf: (key: string) => number;
  historyLength: (key: string) => number;
}

export const useCanvasHistoryStore = create<CanvasHistoryState>((set, get) => ({
  stacks: {},

  record(key, sig, nodes, edges) {
    const normalizedKey = normalizeHistoryKey(key);
    if (!normalizedKey) return false;
    const normalizedSig = sig.trim();
    const stacks = { ...get().stacks };
    const stack = stacks[normalizedKey] ?? emptyStack();
    if (normalizedSig === stack.lastSig) return false;
    const snap = cloneSnapshot({ nodes, edges });
    const trimmed = stack.history.slice(0, stack.index + 1);
    trimmed.push(snap);
    if (trimmed.length > MAX_ENTRIES) trimmed.shift();
    stacks[normalizedKey] = { history: trimmed, index: trimmed.length - 1, lastSig: normalizedSig };
    set({ stacks });
    return true;
  },

  undo(key) {
    const normalizedKey = normalizeHistoryKey(key);
    if (!normalizedKey) return null;
    const stack = get().stacks[normalizedKey];
    if (!stack || stack.index <= 0) return null;
    const nextIdx = stack.index - 1;
    const snap = stack.history[nextIdx];
    if (!snap) return null;
    const stacks = { ...get().stacks };
    stacks[normalizedKey] = { ...stack, index: nextIdx, lastSig: '' };
    set({ stacks });
    return cloneSnapshot(snap);
  },

  redo(key) {
    const normalizedKey = normalizeHistoryKey(key);
    if (!normalizedKey) return null;
    const stack = get().stacks[normalizedKey];
    if (!stack || stack.index >= stack.history.length - 1) return null;
    const nextIdx = stack.index + 1;
    const snap = stack.history[nextIdx];
    if (!snap) return null;
    const stacks = { ...get().stacks };
    stacks[normalizedKey] = { ...stack, index: nextIdx, lastSig: '' };
    set({ stacks });
    return cloneSnapshot(snap);
  },

  reset(key: string, lastSig = '') {
    const normalizedKey = normalizeHistoryKey(key);
    if (!normalizedKey) return;
    const stacks = { ...get().stacks };
    stacks[normalizedKey] = { history: [], index: -1, lastSig: lastSig.trim() };
    set({ stacks });
  },

  canUndo(key) {
    const normalizedKey = normalizeHistoryKey(key);
    const stack = normalizedKey ? get().stacks[normalizedKey] : null;
    return !!stack && stack.index > 0;
  },

  canRedo(key) {
    const normalizedKey = normalizeHistoryKey(key);
    const stack = normalizedKey ? get().stacks[normalizedKey] : null;
    return !!stack && stack.index >= 0 && stack.index < stack.history.length - 1;
  },

  indexOf(key) {
    const normalizedKey = normalizeHistoryKey(key);
    return normalizedKey ? (get().stacks[normalizedKey]?.index ?? -1) : -1;
  },

  historyLength(key) {
    const normalizedKey = normalizeHistoryKey(key);
    return normalizedKey ? (get().stacks[normalizedKey]?.history.length ?? 0) : 0;
  },
}));
