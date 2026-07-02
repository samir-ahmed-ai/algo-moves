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

export function saveProject(name: string, snapshot: ShareState) {
  store.update((data) => ({ ...data, [name]: snapshot }));
}

export function deleteProject(name: string) {
  store.update((data) => {
    const next = { ...data };
    delete next[name];
    return next;
  });
}

export function useProjects(): Record<string, ShareState> {
  return store.use();
}
