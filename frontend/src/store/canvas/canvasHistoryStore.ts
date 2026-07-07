import { create } from 'zustand';
import type { Edge } from '@xyflow/react';
import type { PanelFlowNode } from '@/core/panelFlowTypes';

export type CanvasHistorySnapshot = { nodes: PanelFlowNode[]; edges: Edge[] };

type KeyStack = {
  history: CanvasHistorySnapshot[];
  index: number;
  lastSig: string;
};

const MAX_ENTRIES = 60;

function emptyStack(): KeyStack {
  return { history: [], index: -1, lastSig: '' };
}

interface CanvasHistoryState {
  stacks: Record<string, KeyStack>;
  record: (key: string, sig: string, nodes: PanelFlowNode[], edges: Edge[]) => boolean;
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
    const stacks = { ...get().stacks };
    const stack = stacks[key] ?? emptyStack();
    if (sig === stack.lastSig) return false;
    const snap: CanvasHistorySnapshot = {
      nodes: nodes.map((n) => ({ ...n })),
      edges: edges.map((e) => ({ ...e })),
    };
    const trimmed = stack.history.slice(0, stack.index + 1);
    trimmed.push(snap);
    if (trimmed.length > MAX_ENTRIES) trimmed.shift();
    stacks[key] = { history: trimmed, index: trimmed.length - 1, lastSig: sig };
    set({ stacks });
    return true;
  },

  undo(key) {
    const stack = get().stacks[key];
    if (!stack || stack.index <= 0) return null;
    const nextIdx = stack.index - 1;
    const snap = stack.history[nextIdx];
    if (!snap) return null;
    const stacks = { ...get().stacks };
    stacks[key] = { ...stack, index: nextIdx, lastSig: '' };
    set({ stacks });
    return { nodes: snap.nodes.map((n) => ({ ...n })), edges: snap.edges.map((e) => ({ ...e })) };
  },

  redo(key) {
    const stack = get().stacks[key];
    if (!stack || stack.index >= stack.history.length - 1) return null;
    const nextIdx = stack.index + 1;
    const snap = stack.history[nextIdx];
    if (!snap) return null;
    const stacks = { ...get().stacks };
    stacks[key] = { ...stack, index: nextIdx, lastSig: '' };
    set({ stacks });
    return { nodes: snap.nodes.map((n) => ({ ...n })), edges: snap.edges.map((e) => ({ ...e })) };
  },

  reset(key: string, lastSig = '') {
    const stacks = { ...get().stacks };
    stacks[key] = { history: [], index: -1, lastSig };
    set({ stacks });
  },

  canUndo(key) {
    const stack = get().stacks[key];
    return !!stack && stack.index > 0;
  },

  canRedo(key) {
    const stack = get().stacks[key];
    return !!stack && stack.index >= 0 && stack.index < stack.history.length - 1;
  },

  indexOf(key) {
    return get().stacks[key]?.index ?? -1;
  },

  historyLength(key) {
    return get().stacks[key]?.history.length ?? 0;
  },
}));
