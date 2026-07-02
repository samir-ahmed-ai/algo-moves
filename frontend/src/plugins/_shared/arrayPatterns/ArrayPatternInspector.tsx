import { InspectorRow, VarGrid } from '../vizKit';

/** Render a compact variable grid for array algorithm inspectors. */
export function ArrayPatternInspector({ rows }: { rows: [string, string | number | boolean | null][] }) {
  return (
    <VarGrid>
      {rows.map(([k, v]) => (
        <InspectorRow key={k} k={k} v={v} />
      ))}
    </VarGrid>
  );
}
