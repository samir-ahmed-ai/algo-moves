import { useCallback } from 'react';
import {
  clampSplitPct,
  OVERVIEW_PROBLEM_DEFAULT,
  OVERVIEW_PROBLEM_MAX,
  OVERVIEW_PROBLEM_MIN,
  OVERVIEW_TOP_DEFAULT,
  OVERVIEW_TOP_MAX,
  OVERVIEW_TOP_MIN,
  OVERVIEW_VIZ_DEFAULT,
  OVERVIEW_VIZ_MAX,
  OVERVIEW_VIZ_MIN,
} from '@/lib/editor/resizeSplit';
import { readStorageJson } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { createSyncStore } from '@/store/createSyncStore';

export interface OverviewLayoutPrefs {
  problemPct: number;
  recallTopPct: number;
  vizPct: number;
}

const KEY = STORAGE_KEYS.OVERVIEW_LAYOUT;
const DEFAULTS: OverviewLayoutPrefs = {
  problemPct: OVERVIEW_PROBLEM_DEFAULT,
  recallTopPct: OVERVIEW_TOP_DEFAULT,
  vizPct: OVERVIEW_VIZ_DEFAULT,
};

function clampPrefs(data: Partial<OverviewLayoutPrefs>): OverviewLayoutPrefs {
  return {
    problemPct: clampSplitPct(
      typeof data.problemPct === 'number' ? data.problemPct : DEFAULTS.problemPct,
      OVERVIEW_PROBLEM_MIN,
      OVERVIEW_PROBLEM_MAX,
    ),
    recallTopPct: clampSplitPct(
      typeof data.recallTopPct === 'number' ? data.recallTopPct : DEFAULTS.recallTopPct,
      OVERVIEW_TOP_MIN,
      OVERVIEW_TOP_MAX,
    ),
    vizPct: clampSplitPct(
      typeof data.vizPct === 'number' ? data.vizPct : DEFAULTS.vizPct,
      OVERVIEW_VIZ_MIN,
      OVERVIEW_VIZ_MAX,
    ),
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
