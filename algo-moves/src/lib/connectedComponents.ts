import type { Edge } from '@xyflow/react';

/** Undirected DFS — each component is a set of connected node ids. */
export function findConnectedComponents(nodeIds: string[], edges: Edge[]): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const id of nodeIds) {
    if (visited.has(id)) continue;
    const component: string[] = [];
    dfs(id, visited, component, edges);
    if (component.length > 0) components.push(component);
  }

  return components;
}

function dfs(nodeId: string, visited: Set<string>, component: string[], edges: Edge[]) {
  visited.add(nodeId);
  component.push(nodeId);

  for (const edge of edges) {
    if (edge.source === nodeId && !visited.has(edge.target)) {
      dfs(edge.target, visited, component, edges);
    } else if (edge.target === nodeId && !visited.has(edge.source)) {
      dfs(edge.source, visited, component, edges);
    }
  }
}

/** Map node id → component index for O(1) lookup. */
export function componentIndexMap(components: string[][]): Map<string, number> {
  const map = new Map<string, number>();
  components.forEach((comp, i) => comp.forEach((id) => map.set(id, i)));
  return map;
}
