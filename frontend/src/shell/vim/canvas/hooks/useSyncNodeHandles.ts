import { useEffect } from 'react';
import { useUpdateNodeInternals } from '@xyflow/react';

/** Re-measure handles after mount. */
export function useSyncNodeHandles(nodeId: string) {
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(nodeId);
  }, [nodeId, updateNodeInternals]);
}
