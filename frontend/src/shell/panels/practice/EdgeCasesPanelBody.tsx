import { useEffect, useState } from 'react';
import { readStorageJson, writeStorageJson } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';

import { useCanvasStatic, CheckRow, Hint, Meter, Pill } from '@/shell/canvas';
/** #58 Edge-case finder: a checklist of cases that break naive solutions. */
export function EdgeCasesPanelBody() {
  const { item } = useCanvasStatic();
  const k = STORAGE_KEYS.EDGE_CASES(item.id);
  const CASES = [
    'Empty input (length 0)',
    'Single element',
    'All elements equal / duplicates',
    'Already in the target order',
    'Reverse / worst-case order',
    'Negative, zero, or very large values',
    'Minimum & maximum bounds',
    'No valid answer exists',
  ];
  const isEdgeCaseMap = (value: unknown): value is Record<string, boolean> => {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value).every((v) => typeof v === 'boolean')
    );
  };

  const [done, setDone] = useState<Record<string, boolean>>(() => {
    return readStorageJson(k, {}, isEdgeCaseMap);
  });
  useEffect(() => {
    setDone(readStorageJson(k, {}, isEdgeCaseMap));
  }, [k]);
  const toggle = (c: string) => {
    setDone((d) => {
      const next = { ...d, [c]: !d[c] };
      writeStorageJson(k, next);
      return next;
    });
  };
  const count = CASES.filter((c) => done[c]).length;
  const all = count === CASES.length;
  return (
    <div className="nodrag flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Hint>{all ? 'All considered ✓' : 'Try each via the Input editor.'}</Hint>
        <Pill tone={all ? 'good' : 'muted'}>
          {count}/{CASES.length}
        </Pill>
      </div>
      <Meter value={count} max={CASES.length} tone={all ? 'good' : 'accent'} height={4} />
      <div className="flex flex-col">
        {CASES.map((c) => (
          <CheckRow key={c} checked={!!done[c]} onChange={() => toggle(c)}>
            {c}
          </CheckRow>
        ))}
      </div>
    </div>
  );
}
