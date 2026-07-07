import { useStore } from '@xyflow/react';

export function useHasSelectedPanel(): boolean {
  return useStore((s) => {
    let count = 0;
    for (const node of s.nodes) {
      if (!node.selected || node.type !== 'panel') continue;
      count += 1;
      if (count > 1) return false;
    }
    return count === 1;
  });
}
