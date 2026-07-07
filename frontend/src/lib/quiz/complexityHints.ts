/** Big-O hint strings for quiz choice detail clauses. */
export const COMPLEXITY_HINTS: Readonly<Record<string, string>> = {
  'O(1)': 'constant work per step',
  'O(log n)': 'halve the search space',
  'O(n)': 'one pass over input',
  'O(n log n)': 'sort or divide-and-conquer',
  'O(n²)': 'nested loops over n',
  'O(2ⁿ)': 'explore every subset',
  'O(n!)': 'branching narrows each deeper row',
  'O(V+E)': 'visit every node and edge',
  'O(m·n)': 'grid fill',
};

export const COMPLEXITY_POOL = Object.freeze(Object.keys(COMPLEXITY_HINTS));

export function complexityHint(complexity: string): string {
  return COMPLEXITY_HINTS[complexity.trim()] ?? 'match the observed growth';
}

export function formatComplexityChoice(complexity: string): string {
  return `${complexity} — ${complexityHint(complexity)}`;
}
