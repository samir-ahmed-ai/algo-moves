import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt:
        'Word Search II combines two core techniques. Which pair best describes this solution?',
      choices: [
        {
          label: 'Trie + DFS backtracking — the board',
          correct: true,
        },
        {
          label: 'Hash set + BFS level-order — traversal',
        },
        {
          label: 'Trie + dynamic programming — substrings',
        },
        {
          label: 'Binary search + greedy cell — selection',
        },
      ],
      explain:
        "The code builds a `trieNode` trie from the word list and then runs DFS (`btWordSearchII`) from every cell, using the trie to prune paths that can't complete any word. BFS or DP would not naturally handle the 4-directional path constraint.",
    },
    {
      id: 'pruning',
      prompt:
        'In `btWordSearchII`, the current cell is in bounds and not yet visited. Which trie-based condition then makes the DFS return immediately, before marking the cell or recursing into neighbors?',
      choices: [
        {
          label: '`child == nil` the trie — has no node for the current',
          correct: true,
        },
        {
          label: '`child.word != ""` — a complete word was found',
        },
        {
          label: '`len(*res) > 0` — at least one word has already been collected',
        },
        {
          label: '`node.children` is entirely nil — the parent node is a leaf',
        },
      ],
      explain:
        'After the bounds/visited guard passes, the code computes `child := node.children[ch-\'a\']` and returns when `child == nil`, meaning no word in the trie shares this prefix so continuing in any direction is pointless. Finding a word (`child.word != ""`) does NOT stop the DFS — it records the word and keeps exploring, since longer words may extend this path.',
    },
    {
      id: 'dedup',
      prompt:
        'After a word is added to `res`, the code sets `child.word = ""`. What is the purpose of this step?',
      choices: [
        {
          label: 'Prevents the same word — being added to results more than once',
          correct: true,
        },
        {
          label: 'Frees memory by removing — word from the trie',
        },
        {
          label: 'Signals to the caller — this node is now a dead end',
        },
        {
          label: 'Resets the trie — second DFS pass starts clean',
        },
      ],
      explain:
        'The same word could be found via different starting cells or paths. Clearing `child.word` after the first match ensures `*res = append(*res, child.word)` is only triggered once. The trie structure itself (children pointers) is not removed.',
    },
    {
      id: 'visited',
      prompt:
        'How does the code mark a cell as visited during a single DFS path, and how is the mark undone?',
      choices: [
        {
          label: "Sets `board[r][c] = '#'` — recursing; restores `board[r][c] =",
          correct: true,
        },
        {
          label: 'Stores `(r,c)` in a separate — visited set; removes it after',
        },
        {
          label: 'Sets `board[r][c] = 0`; restores — it with the saved `ch` value',
        },
        {
          label: 'Passes a boolean visited matrix — and flips the bit before and after',
        },
      ],
      explain:
        "The in-place sentinel `'#'` (saved character -> overwrite -> recurse -> restore) avoids allocating an extra visited structure. Using `0` instead of `'#'` would work only if `'0'` is not a valid board character, but the actual code explicitly uses `'#'`.",
    },
    {
      id: 'complexity',
      prompt: 'What is the time complexity of `findWords` as annotated in the problem?',
      choices: [
        {
          label: 'O(m·n·3^L) where L — length of the longest word',
          correct: true,
        },
        {
          label: 'O(m·n·4^L) — The factor is 3^L, not 4^L,',
        },
        {
          label: 'O(W·L + m·n·L) where W — is the number of words',
        },
        {
          label: 'O((m·n)^2) — The factor is 3^L, not 4^L,',
        },
      ],
      explain:
        "The factor is 3^L, not 4^L, because at each DFS step the cell we came from is already marked `'#'`, so at most 3 (not 4) neighbors are valid. O(4^L) is a tempting overcount that ignores this backtracking constraint.",
    },
    {
      id: 'trie-build',
      prompt:
        'During trie construction, the word string is stored at `cur.word` after iterating all characters. What does the code check to know a complete word ends at a given node?',
      choices: [
        {
          label: '`child.word != ""` — a non-empty string signals a terminal node',
          correct: true,
        },
        {
          label: '`child.children` is all-nil — a leaf node with no children',
        },
        {
          label: 'A separate boolean `isEnd` field — on `trieNode`',
        },
        {
          label: "The node's depth equals — expected word length",
        },
      ],
      explain:
        'The `trieNode` struct has no `isEnd` bool; the code repurposes the `word` field itself: non-empty means a word ends here. Leaf detection (no children) would fail for words that are prefixes of other words.',
    },
  ],
};
