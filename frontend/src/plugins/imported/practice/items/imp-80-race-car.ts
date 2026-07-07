import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt:
        "Which search strategy does `racecar` use despite being tagged 'Dynamic Programming'?",
      choices: [
        {
          label: 'BFS over (position — speed) states guaranteeing the',
          correct: true,
        },
        {
          label: 'DFS with memoization over (position — speed) pairs',
        },
        {
          label: "Dijkstra's algorithm with as edge — weight",
        },
        {
          label: '1D DP where dp[pos] = — min steps to reach position pos',
        },
      ],
      explain:
        'The code maintains an explicit queue `q` of [2]int{pos, speed} pairs and processes them level by level (BFS). BFS naturally finds the minimum number of steps because all moves cost 1 instruction. DFS or Dijkstra are not used.',
    },
    {
      id: 'state-representation',
      prompt: 'What two values form a BFS state, and why are both necessary?',
      choices: [
        {
          label: 'Position and speed position alone — is insufficient because speed',
          correct: true,
        },
        {
          label: 'Position and number of steps — taken steps determine whether we',
        },
        {
          label: 'Position and direction (left/right) — only the sign of speed matters',
        },
        {
          label: 'Position and the total distance — traveled since the last Reverse',
        },
      ],
      explain:
        'Accelerate sets np = pos + speed and ns = speed * 2. The same position reached at different speeds leads to different future states, so both must be part of the visited key `[2]int{pos, speed}`.',
    },
    {
      id: 'reverse-move',
      prompt: 'After a Reverse instruction, what is the new speed assigned?',
      choices: [
        {
          label: '-1 if the current speed — is positive, or +1 if the current',
          correct: true,
        },
        {
          label: '0 — the car stops momentarily',
        },
        {
          label: 'The negation of the current — speed (e.g., speed 4 becomes -4)',
        },
        {
          label: '-speed / 2 — half speed in the opposite direction',
        },
      ],
      explain:
        'The code computes `rs = -1; if speed < 0 { rs = 1 }` and enqueues `{pos, rs}`. A Reverse always resets speed to ±1 (unit speed in the opposite direction), not to the negation of the current speed.',
    },
    {
      id: 'pruning-bound',
      prompt:
        'The accelerate branch only enqueues `{np, ns}` when `np > 0 && np < 2*target`. Why is `2*target` the upper bound?',
      choices: [
        {
          label: 'Overshooting beyond 2*target — you would need more steps',
          correct: true,
        },
        {
          label: 'The visited map would overflow — if positions exceed 2*target',
        },
        {
          label: 'The problem guarantees target < — 2^15, so 2*target fits in an int',
        },
        {
          label: 'BFS levels correspond to powers — of 2, and 2*target is the nearest',
        },
      ],
      explain:
        'Any position > 2*target is farther from the target than position 0. The optimal path never needs to overshoot by more than target (going to 2*target and reversing back), so cutting off at np < 2*target keeps the state space finite without missing the optimal solution.',
    },
    {
      id: 'complexity',
      prompt: 'What are the time and space complexities of `racecar` in terms of the target T?',
      choices: [
        {
          label: 'O(T·log T) time and space — Positions range up to 2T and speeds',
          correct: true,
        },
        {
          label: 'O(T²) time, O(T) space — Positions range up to 2T and',
        },
        {
          label: 'O(2^T) time and space — Positions range up to 2T and',
        },
        {
          label: 'O(T) time, O(log T) space — Positions range up to 2T and',
        },
      ],
      explain:
        'Positions range up to 2T and speeds are powers of 2 bounded by O(log T) distinct magnitudes (since they double each step). The number of distinct states is O(T · log T), bounding both the BFS work and the visited-map size.',
    },
    {
      id: 'target-detection',
      prompt:
        'How does the BFS detect that it has reached the target, and at what moment is the answer returned?',
      choices: [
        {
          label: 'Each time a neighbor `np — = pos + speed` is generated, the code',
          correct: true,
        },
        {
          label: 'When a state with `pos — == target` is dequeued from the front',
        },
        {
          label: "When the visited map's size — first reaches `target`, signalling",
        },
        {
          label: 'Only the Reverse branch can land — so the check',
        },
      ],
      explain:
        'Inside the inner loop the code computes `np, ns := pos+speed, speed*2` and then `if np == target { return steps }` before any enqueue. Because the target is detected at generation time, the matching state is returned with the current level counter `steps` and is never added to the queue.',
    },
  ],
};
