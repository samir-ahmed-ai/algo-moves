import { useStore } from '@xyflow/react';

export function useHasSelectedPanel(): boolean {
  return useStore((s) => s.nodes.filter((n) => n.selected && n.type === 'panel').length === 1);
}
