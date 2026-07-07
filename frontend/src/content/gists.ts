/**
 * The concise "ask" shown on a problem's intro (gist) card in Mobile Mode — one
 * plain-language statement of what the problem wants, before the animation kicks
 * in. Resolution order:
 *   1. curated `PROBLEM_GISTS` by item id, then plugin id (hand-tuned for the
 *      priority categories: backtracking, graphs, binary search, DP);
 *   2. the first sentence of the problem summary, when it reads like a request;
 *   3. a per-shape template so every problem still says something useful.
 */
import type { Item } from './types';
import { shapeFor, type ShapeKey } from './problemShape';

/** Curated one-line asks, keyed by item id or plugin id. */
export const PROBLEM_GISTS: Record<string, string> = {
  /* PRIORITY_GISTS_START — backtracking / graphs / binary search / DP */
  // Backtracking
  subsets: 'List every possible subset of the given numbers.',
  'imp-26-subsets': 'List every possible subset of the given numbers.',
  'imp-27-combinations': 'List every way to choose k numbers from 1 to n.',
  'imp-28-combination-of-subset-strings':
    'Build every length-k string from the allowed characters.',
  'imp-29-combination-sum-ii': 'Find each unique combination of numbers that sums to the target.',
  'imp-30-decode-numbers': 'Split the digit string into words every way the dictionary allows.',
  'imp-31-expression-add-operators':
    'Insert +, −, and × between digits so the expression equals the target.',
  'imp-32-generate-binary-strings': 'List every binary string of a given length.',
  'imp-33-strobogrammatic-number-ii':
    'Find every number of length n that reads the same upside down.',
  'imp-34-generate-parentheses':
    'List every way to arrange n pairs of parentheses that stay balanced.',
  'imp-36-letter-combinations-of-a-phone-number':
    'List every word those phone-keypad digits could spell.',
  'imp-37-maximum-length-of-a-concatenated-string-with-uni':
    'Concatenate chosen strings into the longest one with no repeated letter.',
  'imp-38-nested-list-weight-sum':
    'Sum each integer in the nested list, weighted by how deep it sits.',
  'imp-39-different-ways-to-add-parentheses':
    'Compute every result you can get by parenthesizing the expression differently.',
  'imp-40-restore-ip-addresses': 'Find every valid IP address the digit string could form.',
  'imp-41-permutations': 'List every ordering of the given numbers.',
  'imp-42-cartesian-product-of-multiple-arrays':
    'List every combination that picks one item from each array.',
  'imp-43-permutations': 'List every ordering of the characters in the string.',
  'imp-0-06-print-all-paths-from-source-to-destination':
    'List every path from the source node to the destination.',
  'imp-13-robot-room-cleaner': 'Steer the blind robot to clean every reachable cell of the room.',
  // Graphs
  'is-bipartite': "Decide whether the graph's nodes split into two conflict-free groups.",
  'imp-7-is-graph-bipartite':
    "Decide whether the graph's nodes split into two conflict-free groups.",
  'topological-sort': 'Order the tasks so every task comes after its prerequisites.',
  'course-schedule': 'Decide whether you can finish all courses given their prerequisites.',
  'imp-20-course-schedule': 'Decide whether you can finish all courses given their prerequisites.',
  'union-find': 'Connect the cheapest edges to link every node without forming a cycle.',
  'imp-0-01-bfs-shortest-reach': 'Find the fewest edges from the start node to every other node.',
  'imp-0-02-clone-graph': 'Make a deep copy of the graph — every node and edge.',
  'imp-0-03-find-shortest-path-with-bfs':
    'Find the shortest path between two nodes in an unweighted graph.',
  'imp-0-04-graph-traversal': 'Visit every node reachable from the start.',
  'imp-0-05-has-path-from-source-to-destination':
    'Decide whether a path exists from the source node to the destination.',
  'imp-0-08-topological-sort-with-dfs':
    'Order the nodes so every edge points from an earlier node to a later one.',
  'imp-1-subset-component': 'Group items that share set bits and count the connected groups.',
  'imp-2-alien-dictionary': 'Infer the letter order of an alien alphabet from sorted words.',
  'imp-3-remove-invalid-parentheses':
    'Remove the fewest parentheses to make the string valid, every way.',
  'imp-4-floyd-city-of-blinding-lights': 'Find the shortest distance between every pair of cities.',
  'imp-8-merging-communities': 'Merge communities as they connect and report each one’s size.',
  'imp-9-similar-string-groups': 'Group strings that are one swap apart and count the groups.',
  'imp-10-word-ladder': 'Find the shortest chain of single-letter changes from start word to end.',
  'imp-14-the-earliest-moment-when-everyone-become-friends':
    'Find the earliest time every person is connected as friends.',
  'imp-15-find-all-possible-recipes-from-given-supplies':
    'Find which recipes you can make from your starting supplies.',
  'imp-16-detonate-the-maximum-bombs':
    'Pick one bomb to trigger the largest chain reaction of blasts.',
  'imp-17-maximal-network-rank': 'Find the two cities with the most roads touching them combined.',
  'imp-18-number-of-good-paths':
    'Count paths whose two endpoints are the largest value along the way.',
  'imp-19-maximum-score-of-a-node-sequence':
    'Find the highest-scoring sequence of four connected nodes.',
  'imp-22-find-degree-of-vertex': 'Count how many edges touch the given vertex.',
  'imp-23-detect-cycle': 'Decide whether the graph contains a cycle.',
  'imp-25-critical-connections-in-a-network':
    'Find the edges whose removal would split the network apart.',
  // Binary search
  'binary-search': 'Find the position of a target value in a sorted array.',
  'imp-46-search-in-rotated-sorted-array':
    "Find a target's index in a sorted array that has been rotated.",
  'imp-47-maximum-length-of-ribbon-cut':
    'Find the longest piece length that still yields at least k pieces.',
  'imp-48-find-smallest-letter-greater-than-target':
    'Find the smallest letter in the sorted list larger than the target.',
  'imp-49-kth-largest-element-in-an-array': 'Find the kth largest value in the array.',
  'imp-50-find-right-interval':
    'For each interval, find the nearest one starting at or after its end.',
  'imp-51-missing-number-in-arithmetic-progression':
    'Find the one missing term in an evenly-spaced sequence.',
  'imp-52-missing-number': 'Find the missing value from a run of consecutive numbers.',
  'imp-53-find-first-and-last-position-of-element-in-sorte':
    'Find the first and last index of a target in a sorted array.',
  'imp-54-find-peak-element': 'Return the index of any element larger than both its neighbors.',
  'imp-66-longest-increasing-subsequence': 'Find the length of the longest increasing subsequence.',
  // Dynamic programming
  'climbing-stairs': 'Count the ways to climb n stairs taking 1 or 2 steps at a time.',
  'imp-58-climbing-stairs': 'Count the ways to climb n stairs taking 1 or 2 steps at a time.',
  'imp-59-coin-change': 'Find the fewest coins that make the amount, or say it is impossible.',
  'imp-60-coin-change-ii': 'Count the number of ways to make the amount from the coins.',
  'imp-62-filling-bookcase-shelves':
    'Place the books in order on shelves to minimize the total height.',
  'imp-63-0-1-knapsack': 'Pick items within the weight limit to maximize the total value.',
  'imp-64-perfect-squares': 'Find the fewest perfect squares that add up to n.',
  'imp-68-longest-string-chain': 'Find the longest chain of words each made by adding one letter.',
  'imp-69-longest-valid-parentheses': 'Find the length of the longest valid parentheses substring.',
  'imp-70-maximal-rectangle': 'Find the largest all-ones rectangle in a binary matrix.',
  'imp-72-maximum-and-sum-of-array': 'Place numbers into slots to maximize the total AND score.',
  'imp-77-unique-paths': 'Count the paths from the top-left to the bottom-right of a grid.',
  'imp-79-partition-array-into-two-arrays-to-minimize-sum-':
    'Split the numbers into two equal halves with the smallest sum gap.',
  'imp-80-race-car': 'Find the fewest accelerate/reverse moves to reach the target position.',
  'imp-84-student-attendance-record-ii':
    'Count length-n attendance records that still earn an award.',
  /* PRIORITY_GISTS_END */

  // Arrays · prep library
  'prep-arrays-find-duplicate-and-missing':
    'Given n+1 numbers from 1..n, find the duplicated value and the missing one.',
  'prep-arrays-find-duplicate-number':
    'Given n+1 integers in the range 1..n, find the single duplicate without modifying the array.',
  'prep-arrays-find-intersection-of-two-sorted':
    'Return every value that appears in both sorted arrays.',
  'prep-arrays-find-majority-element':
    'Find the element that appears more than half the time in the array.',
  'prep-arrays-jump-game':
    'Decide whether you can reach the last index by jumping up to nums[i] from each position.',
  'prep-arrays-max-product-of-subarray':
    'Find the largest product of any contiguous subarray in the given array.',
  'prep-arrays-max-profit-selling-stocks':
    'Find the maximum profit from one buy and one sell on the price array.',
  'prep-arrays-max-rectangle-in-histogram':
    'Find the largest rectangle area in a histogram of bar heights.',
  'prep-arrays-max-sum-of-subarray-size-k':
    'Find the maximum sum among all contiguous subarrays of exactly size k.',
  'prep-arrays-merge-two-sorted-arrays':
    'Merge nums2 into nums1 in sorted order using O(1) extra space.',
  'prep-arrays-move-all-zeros-to-end':
    'Move all zeros to the end while keeping the relative order of non-zero elements.',
  'prep-arrays-next-permutation':
    'Rearrange nums into the lexicographically next greater permutation, or the lowest if none exists.',
  'prep-arrays-remove-duplicates-in-place':
    'Remove duplicates from a sorted array in place and return the new length.',
  'prep-arrays-reverse-array': 'Reverse the array in place using O(1) extra space.',
  'prep-arrays-rotate-array': 'Rotate the array to the right by k steps in place.',
  'prep-arrays-self-exclude-product':
    'Return an array where each element is the product of all other numbers in nums.',
  'prep-arrays-task-scheduler':
    'Find the least number of CPU intervals needed to schedule all tasks with n cooldown slots.',
  'prep-arrays-trap-most-water': 'Find the maximum water two vertical lines can trap together.',
  'prep-arrays-trap-rain-water':
    'Compute how much rain water is trapped between elevation bars after raining.',
  'prep-arrays-two-sum': 'Find two indices whose values sum to the target.',
};

/** Last-resort ask when a problem carries no usable summary. */
const SHAPE_GIST: Record<ShapeKey, string> = {
  backtracking: 'Explore every choice; undo the ones that fail and keep what works.',
  graph: 'Walk the network node by node to answer a reachability or distance question.',
  binarySearch: 'Halve a sorted range each step to zero in on the answer.',
  dp: 'Split it into overlapping subproblems and build the answer up from small cases.',
  grid: 'Sweep the grid cell by cell, tracking what each position depends on.',
  tree: 'Recurse down the tree, combining answers from the children.',
  array: 'Scan the sequence, keeping just enough state to solve it in one pass.',
  heap: 'Keep the best candidate on top so each step pulls the min or max in log time.',
  linkedList: 'Re-thread the pointers as you walk the list once.',
  generic: 'Read the setup, then spot the pattern that cracks it.',
};

const MAX_GIST = 120;

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : trimmed).trim().replace(/[.!?]+$/, '');
}

/** Reads like a problem statement, not a bare pattern tag ("DFS subset sum"). */
function looksLikeAsk(sentence: string): boolean {
  const words = sentence.split(/\s+/).filter(Boolean);
  return words.length >= 5 && sentence.length <= MAX_GIST;
}

export function gistFor(item: Item): string {
  const curated =
    PROBLEM_GISTS[item.id] ?? (item.pluginId ? PROBLEM_GISTS[item.pluginId] : undefined);
  if (curated) return curated;

  const sentence = firstSentence(item.summary ?? '');
  if (looksLikeAsk(sentence)) return sentence + '.';

  return SHAPE_GIST[shapeFor(item)];
}
