import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt:
        'Which graph algorithm does `findAllRecipes` apply to determine which recipes can be made?',
      choices: [
        {
          label: "Kahn's algorithm (BFS-based — The code maintains an inDeg map,",
          correct: true,
        },
        {
          label: 'DFS post-order topological sort — The code maintains an inDeg map,',
        },
        {
          label: 'Bellman-Ford shortest path — The code maintains an inDeg map,',
        },
        {
          label: 'Union-Find component merging — The code maintains an inDeg map,',
        },
      ],
      explain:
        "The code maintains an `inDeg` map, seeds the BFS queue with available supplies (nodes with no unresolved dependencies), and peels nodes whose in-degree hits 0 — the textbook Kahn's algorithm. DFS topo-sort would use a recursive call stack, not an explicit queue.",
    },
    {
      id: 'graph-model',
      prompt:
        'How does the code model the dependency relationship between ingredients and recipes?',
      choices: [
        {
          label: 'Directed edge from each ingredient — to the recipe that requires it;',
          correct: true,
        },
        {
          label: 'Directed edge from each recipe — to its ingredients; ingredient',
        },
        {
          label: 'Undirected edge between The inner — loop adj[ing] =',
        },
        {
          label: 'Directed edge from recipe — all other recipes that share an',
        },
      ],
      explain:
        "The inner loop `adj[ing] = append(adj[ing], r)` points each ingredient to the recipe it unlocks. `inDeg[r] = len(ingredients[i])` sets the recipe's in-degree to the count of ingredients it needs. When all ingredients of a recipe become available, the in-degree hits 0 and the recipe enters the queue.",
    },
    {
      id: 'queue-seed',
      prompt: 'The BFS queue `q` is initialised with `supplies`, not with recipes. Why?',
      choices: [
        {
          label: 'Supplies are already available — dependencies, so they are the',
          correct: true,
        },
        {
          label: 'Recipes are added — queue only after all their',
        },
        {
          label: 'Supplies are sorted by name — so BFS processes them in',
        },
        {
          label: 'Starting from recipes would cause — a cycle because recipes depend on',
        },
      ],
      explain:
        "In Kahn's algorithm the queue is seeded with nodes that have no prerequisites (in-degree 0). Supplies have no ingredient dependencies, so they are immediately available and serve as the propagation frontier from which recipes can become reachable.",
    },
    {
      id: 'result-collection',
      prompt:
        'A recipe node is appended to `res` at the moment `inDeg[nb] == 0`. What does that condition guarantee?',
      choices: [
        {
          label: "All of that recipe's required — ingredients are now available (from",
          correct: true,
        },
        {
          label: 'The recipe has been attempted — but failed, so it is recorded as a',
        },
        {
          label: 'The recipe — one in topological order and should',
        },
        {
          label: 'The recipe has no further — edges, meaning it is a leaf node in',
        },
      ],
      explain:
        'Each time a supply or recipe is dequeued, it decrements the in-degree of its dependents. When `inDeg[nb]` reaches 0, every ingredient that `nb` needs has been dequeued (i.e., is makeable), so `nb` itself is now makeable and can be collected in `res`.',
    },
    {
      id: 'complexity',
      prompt:
        'What are the time and space complexities of `findAllRecipes`, where V = total unique nodes and E = total ingredient→recipe edges?',
      choices: [
        {
          label: 'Time O(V+E), Space O(V+E) — Building adj and inDeg is O(V+E)',
          correct: true,
        },
        {
          label: 'Time O(V²), Space O(V) — Building adj and inDeg is O(V+E)',
        },
        {
          label: 'Time O(E log V), Space — O(V)',
        },
        {
          label: 'Time O(V·E), Space O(E) — Building adj and inDeg is O(V+E)',
        },
      ],
      explain:
        'Building `adj` and `inDeg` is O(V+E). The BFS visits each node once and processes each edge once, also O(V+E). The adjacency map and in-degree map each use O(V+E) space. This matches the standard BFS topological sort bound.',
    },
    {
      id: 'cycle-handling',
      prompt:
        "If a recipe's ingredients form a cycle (recipe A needs B, B needs A), what does `findAllRecipes` do?",
      choices: [
        {
          label: 'Neither A nor B ever reaches — so they are',
          correct: true,
        },
        {
          label: 'The BFS loop detects — cycle and raises a panic',
        },
        {
          label: 'Both A and B — added to the result because their',
        },
        {
          label: 'The `recipeSet` map is used — to break the cycle by removing one of',
        },
      ],
      explain:
        "Kahn's algorithm naturally handles cycles: nodes in a cycle never have their in-degree decremented to 0 (because each is still waiting for the other), so they never enter the queue and never appear in `res`. No explicit cycle detection is needed.",
    },
  ],
};
