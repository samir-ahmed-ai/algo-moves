import type { QuizQuestion } from '../../core/types';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'what-is-trie',
    prompt: 'What is a trie (prefix tree)?',
    choices: [
      { label: 'Prefix tree — one char per edge', correct: true },
      { label: 'BST on strings — compares whole keys', },
      { label: 'Hash buckets — whole-key lookup', },
      { label: 'Heap by length — wrong structure', },
    ],
    explain:
      'Each node represents a prefix; following edges from the root spells out words one character at a time. Common prefixes share the same nodes near the top of the tree.',
  },
  {
    id: 'why-over-hashset',
    prompt: 'Why use a trie instead of a hash set for prefix queries like "does any word start with car"?',
    choices: [
      { label: 'Prefix walk — hash needs full key', correct: true },
      { label: 'Always less memory — not guaranteed', },
      { label: 'Hash cannot store strings — false', },
      { label: 'Keeps sorted — not primary reason', },
    ],
    explain:
      'A hash set hashes the entire key, so it can only answer "is this exact word present?" To find all words sharing a prefix you would scan every key. A trie reaches the prefix node in O(L) and every descendant under it is a match.',
  },
  {
    id: 'node-children',
    prompt: 'How does each trie node connect to the next character?',
    choices: [
      { label: 'Char → child map — per-letter edges', correct: true },
      { label: 'Single next pointer — loses branching', },
      { label: 'Word list — not trie shape', },
      { label: 'Parent only cannot descend — need child edges per character' },
    ],
    explain:
      'Each node holds children keyed by character. To follow a character you look it up among the children; a missing key means that path does not exist.',
  },
  {
    id: 'end-flag',
    prompt: 'What does the end-of-word flag distinguish?',
    choices: [
      { label: 'Complete word — vs prefix-only node', correct: true },
      { label: 'Leaf vs internal — insufficient', },
      { label: 'Root vs others — wrong flag', },
      { label: 'Branching count — unrelated', },
    ],
    explain:
      'Without the flag you could not tell that "cat" is stored but "ca" is not. A word can also end on an internal node (e.g. "in" inside "inn"), so being a leaf is neither necessary nor sufficient — only the end-of-word flag marks a complete word.',
  },
  {
    id: 'search-vs-startswith',
    prompt: 'How do a full-word lookup and a prefix lookup differ at the end of the walk?',
    choices: [
      { label: 'Word lookup needs end-of-word — prefix just needs the path', correct: true },
      { label: 'Prefix lookup needs end-of-word — reversed', },
      { label: 'Prefix lookup hashes — still walks', },
      { label: 'Identical — they differ on end-of-word', },
    ],
    explain:
      'A prefix lookup only needs the path to exist, so reaching the prefix node is enough. A full-word lookup additionally checks the end-of-word flag on that node — the path can exist as a prefix without a complete word ending there.',
  },
  {
    id: 'complexity',
    prompt: 'Why is searching a trie O(L) in the word length, independent of how many words are stored?',
    choices: [
      { label: 'O(L) — one lookup per character', correct: true },
      { label: 'Rebalanced each insert — false', },
      { label: 'Binary search words — not trie', },
      { label: 'Pre-hash all words — hash set', },
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
