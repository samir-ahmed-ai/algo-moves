import { useCallback } from 'react';
import {
  clampSplitPct,
  OVERVIEW_PROBLEM_DEFAULT,
  OVERVIEW_PROBLEM_MAX,
  OVERVIEW_PROBLEM_MIN,
} from '@/lib/editor/resizeSplit';
import { readStorageJson } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { createSyncStore } from '@/store/createSyncStore';

export interface OverviewLayoutPrefs {
  problemPct: number;
  problemCollapsed: boolean;
}

const KEY = STORAGE_KEYS.OVERVIEW_LAYOUT;
const DEFAULTS: OverviewLayoutPrefs = {
  problemPct: OVERVIEW_PROBLEM_DEFAULT,
  problemCollapsed: false,
};

function clampPrefs(data: Partial<OverviewLayoutPrefs>): OverviewLayoutPrefs {
  return {
    problemPct: clampSplitPct(
      typeof data.problemPct === 'number' ? data.problemPct : DEFAULTS.problemPct,
      OVERVIEW_PROBLEM_MIN,
      OVERVIEW_PROBLEM_MAX,
    ),
    problemCollapsed: data.problemCollapsed === true,
  };
}

function load(): OverviewLayoutPrefs {
  const data = readStorageJson(
    KEY,
    null as Partial<OverviewLayoutPrefs> | null,
    (value): value is Partial<OverviewLayoutPrefs> => value !== null && typeof value === 'object',
  );
  return data ? clampPrefs(data) : DEFAULTS;
}

const store = createSyncStore<OverviewLayoutPrefs>(KEY, load);

export function useOverviewLayoutPrefs(): [OverviewLayoutPrefs, (patch: Partial<OverviewLayoutPrefs>) => void] {
  const current = store.use();
  const set = useCallback((patch: Partial<OverviewLayoutPrefs>) => {
    store.set(clampPrefs({ ...store.get(), ...patch }));
  }, []);
  return [current, set];
}
