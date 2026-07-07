import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'Which graph algorithm does `alienOrder` use to derive the character ordering?',
      choices: [
        {
          label: "BFS topological sort (Kahn's — The code maintains an inDeg map and a",
          correct: true,
        },
        {
          label: 'DFS topological sort — finish-time stack',
        },
        {
          label: "Dijkstra's shortest path — character graph",
        },
        {
          label: 'Union-Find with rank-based merging — The code maintains an inDeg map',
        },
      ],
      explain:
        "The code maintains an `inDeg` map and a FIFO queue of zero-in-degree characters — the hallmarks of Kahn's BFS-based topological sort. DFS topo-sort would use the call stack and a postorder result.",
    },
    {
      id: 'edge-extraction',
      prompt:
        'How does the code determine that character `a` must come before character `b` in the alien alphabet?',
      choices: [
        {
          label: 'It finds the first position — j where adjacent words differ: w1[j]',
          correct: true,
        },
        {
          label: 'It compares all characters across — all pairs of words in the list',
        },
        {
          label: 'It sorts characters by their — frequency across all words',
        },
        {
          label: 'It infers ordering — positions of characters within a',
        },
      ],
      explain:
        'Only the first differing character between consecutive words reveals an ordering constraint. All subsequent characters in those words are uninformative, hence the `break` after the first mismatch.',
    },
    {
      id: 'invalid-input',
      prompt:
        'What invalid input does the check `len(w1) > len(w2) && w1[:len(w2)] == w2` detect, and what does the code return?',
      choices: [
        {
          label: 'A word — prefix of the next word but is listed',
          correct: true,
        },
        {
          label: 'Duplicate words in the list — returns ""',
        },
        {
          label: 'A word containing characters not in any other word — returns ""',
        },
        {
          label: 'A cycle in the character graph — returns ""',
        },
      ],
      explain:
        'If `w1` is longer than `w2` yet `w2` is a prefix of `w1`, the ordering is impossible (like ["abc","ab"] in a lexicographic sense). The cycle-detection is handled separately by the length check at the end.',
    },
    {
      id: 'cycle-detection',
      prompt: 'How does `alienOrder` detect a cycle in the character ordering graph?',
      choices: [
        {
          label: 'If `len(res) != len(inDeg)` — some nodes were never dequeued',
          correct: true,
        },
        {
          label: 'It explicitly runs DFS — checks for back edges',
        },
        {
          label: 'It checks whether `inDeg` — contains entries with value > 0 after',
        },
        {
          label: 'It counts edges and compares — to the number of characters',
        },
      ],
      explain:
        "In Kahn's algorithm, any node involved in a cycle will never reach in-degree 0 and thus never enter the queue. Comparing the result length to the total character count catches this.",
    },
    {
      id: 'complexity',
      prompt:
        'The stated time complexity is O(C) where C is the total number of characters across all words. Why not O(V+E) in terms of unique chars and edges?',
      choices: [
        {
          label: 'The character set is bounded — (at most 26 letters), so V and E are',
          correct: true,
        },
        {
          label: 'The BFS runs faster — O(V+E) due to the map data structure',
        },
        {
          label: 'Edges are never explicitly stored — eliminating the E term',
        },
        {
          label: 'The algorithm skips characters — appear only once',
        },
      ],
      explain:
        'With at most 26 distinct characters, V≤26 and E≤26²=676 are constants. The bottleneck is reading all C characters to initialize nodes and extract ordering constraints.',
    },
    {
      id: 'dedup-edge',
      prompt:
        'Why does the code check `if !adj[w1[j]][w2[j]]` before adding an edge and incrementing `inDeg[w2[j]]`?',
      choices: [
        {
          label: 'To avoid counting duplicate edges — which would inflate in-degree and',
          correct: true,
        },
        {
          label: 'To skip edges between characters — in the same word',
        },
        {
          label: 'To handle the case — w1[j] and w2[j] are the same character',
        },
        {
          label: 'To reduce memory usage — the graph is dense',
        },
      ],
      explain:
        'Multiple word pairs can imply the same ordering constraint. Adding the edge twice would increment `inDeg` twice, so that node would never reach 0 even in an acyclic graph, causing a false cycle report.',
    },
  ],
};
