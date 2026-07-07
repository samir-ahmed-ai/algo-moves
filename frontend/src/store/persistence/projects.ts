import type { ShareState } from '@/store/navigation/shareState';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { createSyncStore } from '@/store/createSyncStore';
import { readStorageJson } from './storage';

/**
 * Named saved workspaces (#87). A project is just a ShareState snapshot stored in
 * localStorage by name; loading one applies the same problem/mode/theme.
 */
const KEY = STORAGE_KEYS.PROJECTS;

const store = createSyncStore<Record<string, ShareState>>(KEY, () =>
  readStorageJson<Record<string, ShareState>>(KEY, {}),
);

function projectName(name: string): string | null {
  const normalized = name.trim();
  return normalized || null;
}

export function saveProject(name: string, snapshot: ShareState) {
  const key = projectName(name);
  if (!key) return;
  store.update((data) => ({ ...data, [key]: snapshot }));
}

export function deleteProject(name: string) {
  const key = projectName(name);
  if (!key) return;
  store.update((data) => {
    const next = { ...data };
    delete next[key];
    return next;
  });
}

export function useProjects(): Record<string, ShareState> {
  return store.use();
}
