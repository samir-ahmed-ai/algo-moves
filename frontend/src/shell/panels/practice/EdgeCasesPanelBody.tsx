import { EDGE_CASE_LABELS, useEdgeCases } from '@/store/practice/edgeCases';

import { useCanvasStatic, CheckRow, Hint, Meter, Pill } from '@/shell/canvas';
/** #58 Edge-case finder: a checklist of cases that break naive solutions. */
export function EdgeCasesPanelBody() {
  const { item } = useCanvasStatic();
  const [done, toggle] = useEdgeCases(item.id);
  const count = EDGE_CASE_LABELS.filter((c) => done[c]).length;
  const all = count === EDGE_CASE_LABELS.length;
  return (
    <div className="nodrag flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Hint>{all ? 'All considered ✓' : 'Try each via the Input editor.'}</Hint>
        <Pill tone={all ? 'good' : 'muted'}>
          {count}/{EDGE_CASE_LABELS.length}
        </Pill>
      </div>
      <Meter value={count} max={EDGE_CASE_LABELS.length} tone={all ? 'good' : 'accent'} height={4} />
      <div className="flex flex-col">
        {EDGE_CASE_LABELS.map((c) => (
          <CheckRow key={c} checked={!!done[c]} onChange={() => toggle(c)}>
            {c}
          </CheckRow>
        ))}
      </div>
    </div>
  );
}
