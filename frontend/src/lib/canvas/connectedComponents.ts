import type { Edge } from '@xyflow/react';

function normalizeId(id: string): string {
  return id.trim();
}

/** Undirected DFS — each component is a set of connected node ids. */
export function findConnectedComponents(
  nodeIds: readonly string[],
  edges: readonly Edge[],
): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];
  const ids = Array.from(new Set(nodeIds.map(normalizeId).filter(Boolean)));
  const idSet = new Set(ids);
  const adj = new Map<string, string[]>();
  for (const id of ids) adj.set(id, []);
  for (const edge of edges) {
    const source = normalizeId(edge.source);
    const target = normalizeId(edge.target);
    if (!source || !target || !idSet.has(source) || !idSet.has(target)) continue;
    adj.get(source)?.push(target);
    adj.get(target)?.push(source);
  }

  for (const id of ids) {
    if (visited.has(id)) continue;
    const component: string[] = [];
    dfs(id, visited, component, adj);
    if (component.length > 0) components.push(component);
  }

  return components;
}

function dfs(
  nodeId: string,
  visited: Set<string>,
  component: string[],
  adj: Map<string, string[]>,
): void {
  visited.add(nodeId);
  component.push(nodeId);

  for (const next of adj.get(nodeId) ?? [])
    if (!visited.has(next)) dfs(next, visited, component, adj);
}

/** Map node id → component index for O(1) lookup. */
export function componentIndexMap(components: readonly (readonly string[])[]): Map<string, number> {
  const map = new Map<string, number>();
  components.forEach((comp, i) =>
    comp.forEach((id) => {
      const key = normalizeId(id);
      if (key) map.set(key, i);
    }),
  );
  return map;
}
