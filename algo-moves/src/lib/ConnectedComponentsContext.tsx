import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Edge } from '@xyflow/react';
import { componentIndexMap, findConnectedComponents } from './connectedComponents';

interface ConnectedComponentsCtx {
  components: string[][];
  indexOf: (nodeId: string) => number;
  sameComponent: (a: string, b: string) => boolean;
}

const Ctx = createContext<ConnectedComponentsCtx | null>(null);

export function ConnectedComponentsProvider({
  nodeIds,
  edges,
  children,
}: {
  nodeIds: string[];
  edges: Edge[];
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const components = findConnectedComponents(nodeIds, edges);
    const indexMap = componentIndexMap(components);
    return {
      components,
      indexOf: (id: string) => indexMap.get(id) ?? -1,
      sameComponent: (a: string, b: string) => indexMap.get(a) === indexMap.get(b) && indexMap.has(a),
    };
  }, [nodeIds, edges]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConnectedComponents() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConnectedComponents must be used inside ConnectedComponentsProvider');
  return ctx;
}

/** Safe hook — returns null when outside provider. */
export function useConnectedComponentsOptional() {
  return useContext(Ctx);
}
