import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Edge } from '@xyflow/react';
import { componentIndexMap, findConnectedComponents } from './connectedComponents';

interface ConnectedComponentsCtx {
  readonly components: readonly (readonly string[])[];
  readonly indexOf: (nodeId: string) => number;
  readonly sameComponent: (a: string, b: string) => boolean;
}

const Ctx = createContext<ConnectedComponentsCtx | null>(null);

function normalizeId(id: string): string {
  return id.trim();
}

export function ConnectedComponentsProvider({
  nodeIds,
  edges,
  children,
}: {
  readonly nodeIds: readonly string[];
  readonly edges: readonly Edge[];
  readonly children: ReactNode;
}): ReactNode {
  const value = useMemo(() => {
    const components = findConnectedComponents(nodeIds, edges);
    const indexMap = componentIndexMap(components);
    return {
      components,
      indexOf: (id: string) => indexMap.get(normalizeId(id)) ?? -1,
      sameComponent: (a: string, b: string) => {
        const left = normalizeId(a);
        const right = normalizeId(b);
        return indexMap.get(left) === indexMap.get(right) && indexMap.has(left);
      },
    };
  }, [nodeIds, edges]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConnectedComponents(): ConnectedComponentsCtx {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error('useConnectedComponents must be used inside ConnectedComponentsProvider');
  return ctx;
}

/** Safe hook — returns null when outside provider. */
export function useConnectedComponentsOptional(): ConnectedComponentsCtx | null {
  return useContext(Ctx);
}
