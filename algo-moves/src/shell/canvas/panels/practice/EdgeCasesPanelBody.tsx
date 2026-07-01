import { useEffect, useState } from 'react';
import { useCanvasStatic } from '../../CanvasContext';
import { CheckRow, Hint, Meter, Pill } from '../../nodeui';

/** #58 Edge-case finder: a checklist of cases that break naive solutions. */
export function EdgeCasesPanelBody() {
  const { item } = useCanvasStatic();
  const k = `algo-moves:edgecases:${item.id}`;
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
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(k) ?? '{}');
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(k) ?? '{}'));
    } catch {
      setDone({});
    }
  }, [k]);
  const toggle = (c: string) => {
    setDone((d) => {
      const next = { ...d, [c]: !d[c] };
      try {
        localStorage.setItem(k, JSON.stringify(next));
      } catch {
        // ignore
      }
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
