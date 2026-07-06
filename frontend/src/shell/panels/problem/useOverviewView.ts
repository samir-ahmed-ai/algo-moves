import { useCallback, useEffect, useState } from 'react';
import { readStorageText, writeStorageText } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';
import type { OverviewView } from './OverviewViewSwitch';

function loadView(itemId: string): OverviewView {
  const saved = readStorageText(STORAGE_KEYS.OVERVIEW_VIEW(itemId), null);
  return saved === 'recall' ? 'recall' : 'animate';
}

/** Persisted Animate / Recall toggle for the overview two-column layout. */
export function useOverviewView(itemId: string) {
  const [view, setViewState] = useState<OverviewView>(() => loadView(itemId));

  useEffect(() => {
    setViewState(loadView(itemId));
  }, [itemId]);

  const setView = useCallback(
    (next: OverviewView) => {
      setViewState(next);
      writeStorageText(STORAGE_KEYS.OVERVIEW_VIEW(itemId), next);
    },
    [itemId],
  );

  return [view, setView] as const;
}
