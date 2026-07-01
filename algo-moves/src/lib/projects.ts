import { useSyncExternalStore } from 'react';
import type { ShareState } from './shareState';

/**
 * Named saved workspaces (#87). A project is just a ShareState snapshot stored in
 * localStorage by name; loading one applies the same problem/mode/theme.
 */
const KEY = 'algo-moves:projects';

function load(): Record<string, ShareState> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Record<string, ShareState>;
  } catch {
    // ignore
  }
  return {};
}

let data: Record<string, ShareState> = load();
const listeners = new Set<() => void>();

function commit(next: Record<string, ShareState>) {
  data = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore quota/private-mode failures
  }
  listeners.forEach((l) => l());
}

export function saveProject(name: string, snapshot: ShareState) {
  commit({ ...data, [name]: snapshot });
}

export function deleteProject(name: string) {
  const next = { ...data };
  delete next[name];
  commit(next);
}

export function useProjects(): Record<string, ShareState> {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => data,
    () => data,
  );
}
