import { InspectorRow, VarGrid, VizTree, vizText, type TreeNode } from '../vizKit';
import { cn } from '@/lib/utils/cn';

export type ArrayPatternInspectorValue = string | number | boolean | null | readonly TreeNode[];

// `Array.isArray` alone doesn't narrow away a `readonly T[]` member from a
// union (it isn't a subtype of the guard's mutable `any[]`), so use an
// explicit predicate instead.
function isTreeNodes(v: ArrayPatternInspectorValue): v is readonly TreeNode[] {
  return Array.isArray(v);
}

/**
 * Render a compact variable grid for array algorithm inspectors. A row value
 * can be a `TreeNode[]` for structured state (maps, seen-sets, path stacks)
 * that reads better as an indented, multi-row tree than a single flat line.
 */
export function ArrayPatternInspector({ rows }: { rows: [string, ArrayPatternInspectorValue][] }) {
  return (
    <VarGrid>
      {rows.map(([k, v]) => {
        if (isTreeNodes(v)) {
          return (
            <div key={k} className="py-[3px]">
              <span className={cn(vizText.sm, 'text-ink3')}>{k}</span>
              <VizTree nodes={v} />
            </div>
          );
        }
        return <InspectorRow key={k} k={k} v={v} />;
      })}
    </VarGrid>
  );
}
