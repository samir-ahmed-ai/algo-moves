import type { QuizQuestion } from '../../core/types';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'what-is-trie',
    prompt: 'What is a trie (prefix tree)?',
    choices: [
      { label: 'A tree where each path from the root spells a string, one character per edge', correct: true },
      { label: 'A balanced binary search tree keyed by whole strings' },
      { label: 'A hash table that stores words in buckets' },
      { label: 'A heap ordered by string length' },
    ],
    explain:
      'Each node represents a prefix; following edges from the root spells out words one character at a time. Common prefixes share the same nodes near the top of the tree.',
  },
  {
    id: 'why-over-hashset',
    prompt: 'Why use a trie instead of a hash set for prefix queries like "does any word start with car"?',
    choices: [
      { label: 'A trie answers prefix questions by walking one path; a hash set only knows whole keys', correct: true },
      { label: 'A trie uses less memory than a hash set in every case' },
      { label: 'A hash set cannot store strings' },
      { label: 'A trie keeps the words sorted, which a hash set cannot do' },
    ],
    explain:
      'A hash set hashes the entire key, so it can only answer "is this exact word present?" To find all words sharing a prefix you would scan every key. A trie reaches the prefix node in O(L) and every descendant under it is a match.',
  },
  {
    id: 'node-children',
    prompt: 'How does each trie node connect to the next character?',
    choices: [
      { label: 'A map (or array) from a character to the child node for that character', correct: true },
      { label: 'A single pointer to the next node regardless of character' },
      { label: 'A linked list of every word that passes through it' },
      { label: 'A back-pointer to its parent only' },
    ],
    explain:
      'Each node holds children keyed by character (children map[rune]*node). To follow a character you look it up among the children; a missing key means that path does not exist.',
  },
  {
    id: 'end-flag',
    prompt: 'What does the end-of-word flag (isEnd) distinguish?',
    choices: [
      { label: 'A node that completes a stored word from a node that is only a prefix of one', correct: true },
      { label: 'A leaf node from an internal node' },
      { label: 'The root from every other node' },
      { label: 'Whether a node has more than one child' },
    ],
    explain:
      'Without the flag you could not tell that "cat" is stored but "ca" is not. A word can also end on an internal node (e.g. "in" inside "inn"), so being a leaf is neither necessary nor sufficient — only isEnd marks a complete word.',
  },
  {
    id: 'search-vs-startswith',
    prompt: 'How do search(word) and startsWith(prefix) differ at the end of the walk?',
    choices: [
      { label: 'Both walk the path; search also requires the final node to have isEnd set', correct: true },
      { label: 'startsWith requires isEnd; search does not' },
      { label: 'search walks edges but startsWith hashes the prefix instead' },
      { label: 'They are identical and always return the same answer' },
    ],
    explain:
      'startsWith only needs the path to exist, so reaching the prefix node is enough. search additionally checks isEnd on that node — the path can exist as a prefix without a complete word ending there.',
  },
  {
    id: 'complexity',
    prompt: 'Why is searching a trie O(L) in the word length, independent of how many words are stored?',
    choices: [
      { label: 'Each character follows exactly one child lookup, so you touch L nodes regardless of the dictionary size', correct: true },
      { label: 'Because the trie is rebalanced after every insert' },
      { label: 'Because it binary-searches the sorted words' },
      { label: 'Because every word is hashed once up front' },
    ],
    explain:
      'A search of a word of length L performs L child lookups (each O(1) for a fixed alphabet), one per character — it never scans the other stored words. Space, however, scales with the total number of characters across all inserted words.',
  },
];

/** Ordered decomposition of the Go solution for the Code Studio reassemble drill. */
export const codePieces: CodePiece[] = [
  { id: 'node', code: 'type node struct {\n\tchildren map[rune]*node\n\tisEnd    bool\n}', role: 'a node maps each next character to a child, and flags a complete word' },
  { id: 'newnode', code: 'func newNode() *node {\n\treturn &node{children: make(map[rune]*node)}\n}', role: 'allocate a node with an empty children map' },
  { id: 'trie', code: 'type Trie struct{ root *node }', role: 'the trie is just its root node' },
  { id: 'newtrie', code: 'func NewTrie() *Trie { return &Trie{root: newNode()} }', role: 'start with an empty root' },
  { id: 'insert-sig', code: 'func (t *Trie) Insert(word string) {\n\tcur := t.root', role: 'insert: begin the walk at the root' },
  { id: 'insert-loop', code: '\tfor _, ch := range word {\n\t\tnext, ok := cur.children[ch]', role: 'for each character, look for an existing child' },
  { id: 'insert-create', code: '\t\tif !ok {\n\t\t\tnext = newNode()\n\t\t\tcur.children[ch] = next\n\t\t}', role: 'no child for this char → create one (shared prefixes reuse existing nodes)' },
  { id: 'insert-down', code: '\t\tcur = next\n\t}', role: 'descend into the child and continue' },
  { id: 'insert-mark', code: '\tcur.isEnd = true\n}', role: 'mark the final node as end-of-word' },
  { id: 'search-sig', code: 'func (t *Trie) Search(word string) bool {\n\tcur := t.root', role: 'search: begin the walk at the root' },
  { id: 'search-loop', code: '\tfor _, ch := range word {\n\t\tnext, ok := cur.children[ch]', role: 'follow one child per character' },
  { id: 'search-miss', code: '\t\tif !ok {\n\t\t\treturn false\n\t\t}\n\t\tcur = next\n\t}', role: 'a missing child means the word is absent; otherwise descend' },
  { id: 'search-end', code: '\treturn cur.isEnd\n}', role: 'path exists → true only if this node ends a stored word' },
];
