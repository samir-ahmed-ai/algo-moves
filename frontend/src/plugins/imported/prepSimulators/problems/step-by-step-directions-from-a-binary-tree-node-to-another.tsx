import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface DirectionsInput {
  // Level-order binary tree; null marks an absent slot. Children of i are 2i+1, 2i+2.
  tree: (number | null)[];
  startValue: number;
  destValue: number;
}

type Phase = 'find-start' | 'find-dest' | 'compare' | 'done';

interface DirectionsState {
  tree: (number | null)[];
  startValue: number;
  destValue: number;
  phase: Phase;
  current: number | null; // node index currently being visited
  startPathNodes: number[]; // node indices root→start (once found)
  destPathNodes: number[]; // node indices root→dest (once found)
  startDirs: string; // 'L'/'R' string root→start
  destDirs: string; // 'L'/'R' string root→dest
  found: number[]; // node indices on the path found so far in the active DFS
  lcaLen: number | null; // length of common prefix (LCA depth)
  answer: string | null; // final U…L/R directions
  done: boolean;
}

function record({ tree, startValue, destValue }: DirectionsInput): Frame<DirectionsState>[] {
  let phase: Phase = 'find-start';
  let startPathNodes: number[] = [];
  let destPathNodes: number[] = [];
  let startDirs = '';
  let destDirs = '';
  let lcaLen: number | null = null;
  let answer: string | null = null;

  const { emit, frames } = createRecorder<DirectionsState>(() => ({
    tree,
    startValue,
    destValue,
    phase,
    current: null,
    startPathNodes: startPathNodes.slice(),
    destPathNodes: destPathNodes.slice(),
    startDirs,
    destDirs,
    found: [],
    lcaLen,
    answer,
    done: false,
  }));

  emit(
    'INIT',
    'find both paths',
    `Step-By-Step Directions: we want the shortest walk from node ${startValue} to node ${destValue}. Trick: find the root→start path and root→dest path as strings of L/R turns, drop their shared prefix (that shared node is the LCA), turn the leftover start turns into U (go up), then append the leftover dest turns.`,
    { phase: 'find-start' },
  );

  // ---- Phase 1: locate the start node, recording the root→start path. ----
  {
    const dirs: string[] = [];
    const nodes: number[] = [];
    const walk = (i: number): boolean => {
      if (i >= tree.length || tree[i] == null) return false;
      nodes.push(i);
      const val = tree[i] as number;
      if (val === startValue) {
        emit(
          'HIT-START',
          `start=${val}`,
          `Reached the start node ${val}. The turns taken from the root spell "${dirs.join('') || '(root)'}", so that is the root→start path.`,
          { phase: 'find-start', current: i, found: nodes.slice() },
          'good',
        );
        return true;
      }
      emit(
        'VISIT-START',
        `at ${val}`,
        `Looking for start (${startValue}). Standing on node ${val}; not it yet, so keep the DFS going and remember the turns we take.`,
        { phase: 'find-start', current: i, found: nodes.slice() },
      );
      dirs.push('L');
      if (walk(2 * i + 1)) return true;
      dirs[dirs.length - 1] = 'R';
      if (walk(2 * i + 2)) return true;
      dirs.pop();
      nodes.pop();
      return false;
    };
    walk(0);
    startDirs = dirs.join('');
    startPathNodes = nodes.slice();
  }

  emit(
    'START-DONE',
    `sp="${startDirs || '·'}"`,
    `Root→start directions captured: "${startDirs || '(start is the root)'}". Now repeat the search for the destination node ${destValue}.`,
    { phase: 'find-dest', startPathNodes, startDirs, found: startPathNodes },
  );

  // ---- Phase 2: locate the dest node, recording the root→dest path. ----
  phase = 'find-dest';
  {
    const dirs: string[] = [];
    const nodes: number[] = [];
    const walk = (i: number): boolean => {
      if (i >= tree.length || tree[i] == null) return false;
      nodes.push(i);
      const val = tree[i] as number;
      if (val === destValue) {
        emit(
          'HIT-DEST',
          `dest=${val}`,
          `Reached the dest node ${val}. The turns from the root spell "${dirs.join('') || '(root)'}", so that is the root→dest path.`,
          { phase: 'find-dest', current: i, found: nodes.slice() },
          'good',
        );
        return true;
      }
      emit(
        'VISIT-DEST',
        `at ${val}`,
        `Looking for dest (${destValue}). Standing on node ${val}; not it yet, so continue the DFS and track each L/R turn.`,
        { phase: 'find-dest', current: i, found: nodes.slice() },
      );
      dirs.push('L');
      if (walk(2 * i + 1)) return true;
      dirs[dirs.length - 1] = 'R';
      if (walk(2 * i + 2)) return true;
      dirs.pop();
      nodes.pop();
      return false;
    };
    walk(0);
    destDirs = dirs.join('');
    destPathNodes = nodes.slice();
  }

  emit(
    'DEST-DONE',
    `dp="${destDirs || '·'}"`,
    `Root→dest directions captured: "${destDirs || '(dest is the root)'}". Both paths in hand — now strip the common prefix to find where they diverge (the LCA).`,
    { phase: 'compare', destPathNodes, destDirs, found: [] },
  );

  // ---- Phase 3: strip the common prefix (walk both direction strings). ----
  phase = 'compare';
  let k = 0;
  while (k < startDirs.length && k < destDirs.length && startDirs[k] === destDirs[k]) {
    // startPathNodes[0] is the root; the k-th direction leads to node k+1 on the path.
    const sharedNode = startPathNodes[k + 1];
    lcaLen = k + 1;
    emit(
      'PREFIX-MATCH',
      `sp[${k}]==dp[${k}]=='${startDirs[k]}'`,
      `Position ${k}: both paths turn '${startDirs[k]}', so they still share node ${tree[sharedNode]}. This turn is above the split — skip it and advance the prefix.`,
      {
        phase: 'compare',
        current: sharedNode,
        lcaLen: k + 1,
        found: startPathNodes.slice(0, k + 2),
      },
    );
    k++;
  }

  const lcaNode = startPathNodes[k]; // node where the two paths diverge = LCA
  lcaLen = k;
  const stopReason =
    k >= startDirs.length
      ? `the start path ran out (start is at/above the split)`
      : k >= destDirs.length
        ? `the dest path ran out (dest is at/above the split)`
        : `sp[${k}]='${startDirs[k]}' differs from dp[${k}]='${destDirs[k]}'`;
  emit(
    'LCA',
    `LCA=${tree[lcaNode]}`,
    `The common prefix ends at length ${k} because ${stopReason}. Node ${tree[lcaNode]} is the lowest common ancestor — from here we go UP out of the start branch, then DOWN the dest branch.`,
    { phase: 'compare', current: lcaNode, lcaLen: k, found: startPathNodes.slice(0, k + 1) },
    'good',
  );

  // ---- Phase 4: build answer — one 'U' per leftover start turn, then dest tail. ----
  const ups = 'U'.repeat(Math.max(0, startDirs.length - k));
  const tail = destDirs.slice(k);
  answer = ups + tail;
  phase = 'done';
  emit(
    'BUILD',
    ups ? `${ups.length}×U` : 'no U',
    `The start path has ${startDirs.length - k} turn(s) below the LCA, so we climb up ${startDirs.length - k} time(s): "${ups || '(none)'}". That lands us on the LCA (node ${tree[lcaNode]}).`,
    {
      phase: 'done',
      current: lcaNode,
      lcaLen: k,
      answer: ups,
      found: startPathNodes.slice(0, k + 1),
    },
  );

  emit(
    'DONE',
    answer || '(same node)',
    `Now descend along the dest branch by appending its leftover turns "${tail || '(none)'}". Final directions: "${answer || '(start == dest)'}". Time O(n) — two DFS passes visit each node once; Space O(n) — the path strings and recursion stack.`,
    {
      phase: 'done',
      current: destPathNodes[destPathNodes.length - 1] ?? null,
      lcaLen: k,
      answer,
      found: destPathNodes,
      done: true,
    },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<DirectionsState>) {
  const s = frame.state;
  const startIdx = s.startPathNodes[s.startPathNodes.length - 1];
  const destIdx = s.destPathNodes[s.destPathNodes.length - 1];
  const lcaIdx = s.lcaLen != null ? s.startPathNodes[s.lcaLen] : null;

  const nodeClass = (i: number) => {
    if (s.done && (i === startIdx || i === destIdx)) return 'team-2';
    if (lcaIdx != null && i === lcaIdx && s.phase !== 'find-start' && s.phase !== 'find-dest')
      return 'team-2';
    if (s.current === i) return 'team-1';
    if (s.found.includes(i)) return 'team-2';
    return 'team-0';
  };

  const lcaVal = lcaIdx != null && lcaIdx < s.tree.length ? s.tree[lcaIdx] : null;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        start = <span className="font-mono text-ink">{s.startValue}</span>
        {' · '}dest = <span className="font-mono text-ink">{s.destValue}</span>
        {(s.phase === 'compare' || s.phase === 'done') && lcaVal != null && (
          <>
            {' · '}LCA = <span className="font-mono text-ink">{lcaVal}</span>
          </>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
      <div className={cn('font-mono', vizText.sm, 'text-ink3')}>
        sp = <span className="text-ink">"{s.startDirs || '·'}"</span>
        {' · '}dp = <span className="text-ink">"{s.destDirs || '·'}"</span>
      </div>
      {s.answer != null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ "{s.answer || '·'}"</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<DirectionsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curVal = s.current != null && s.current < s.tree.length ? s.tree[s.current] : null;
  const lcaIdx = s.lcaLen != null ? s.startPathNodes[s.lcaLen] : null;
  const lcaVal = lcaIdx != null && lcaIdx < s.tree.length ? s.tree[lcaIdx] : null;
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="current node" v={curVal ?? '—'} />
      <InspectorRow k="sp (root→start)" v={s.startDirs ? `"${s.startDirs}"` : '…'} />
      <InspectorRow k="dp (root→dest)" v={s.destDirs ? `"${s.destDirs}"` : '…'} />
      <InspectorRow
        k="prefix / LCA"
        v={s.lcaLen != null ? `${s.lcaLen} (${lcaVal ?? '—'})` : '…'}
      />
      <InspectorRow k="answer" v={s.answer != null ? `"${s.answer}"` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-step-by-step-directions-from-a-binary-tree-node-to-another';
export const title = 'Step-By-Step Directions From a Binary Tree Node to Another';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Step-By-Step Directions From a Binary Tree Node to Another"?',
    choices: [
      {
        label: 'Two Paths + LCA via Common Prefix — fits this problem',
        correct: true,
      },
      {
        label: 'Reverse inorder — different approach',
      },
      {
        label: 'Mirror compare — different approach',
      },
      {
        label: 'BFS + Direction Toggle — different approach',
      },
    ],
    explain: "Find root-to-start path and root-to-dest path (as sequences of 'L'/'R')",
  },
  {
    id: 'key-step',
    prompt: 'On the "LCA" step (LCA=), what happens?',
    choices: [
      {
        label: 'The common prefix ends at length — this move caption',
        correct: true,
      },
      {
        label: 'Run terminates immediately — no further frames',
      },
      {
        label: 'Pointers reset to zero — restart scan',
      },
      {
        label: 'Remaining input skipped — early return path',
      },
    ],
    explain:
      'The common prefix ends at length  because . Node  is the lowest common ancestor — from here we go UP out of the start branch, then DOWN the dest branch.',
  },
  {
    id: 'state',
    prompt: 'What does the `current` field track in the visualization state?',
    choices: [
      {
        label: 'node index currently being visited — updated each frame',
        correct: true,
      },
      {
        label: 'Fixed display label — unchanged each frame',
      },
      {
        label: 'Shuffle seed value — for random ordering',
      },
      {
        label: 'Failure error code — set once at end',
      },
    ],
    explain: 'The recorder keeps `current` in sync: node index currently being visited',
  },
  {
    id: 'complexity',
    prompt:
      'What are the time and space complexities for "Step-By-Step Directions From a Binary Tree Node to Another"?',
    choices: [
      {
        label: 'O(n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(h) time, O(1) space — wrong order of growth',
      },
    ],
    explain:
      "O(n). O(n). Find root-to-start path and root-to-dest path (as sequences of 'L'/'R'); Strip the common prefix (LCA). Remaining start path → all 'U's, append remaining dest p",
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'The common prefix ends at length — final DONE caption',
        correct: true,
      },
      {
        label: 'Incomplete partial result — more steps needed',
      },
      {
        label: 'Input left unchanged — no mutations applied',
      },
      {
        label: 'Aborted run on failure — infinite loop detected',
      },
    ],
    explain:
      'The common prefix ends at length  because . Node  is the lowest common ancestor — from here we go UP out of the start branch, then DOWN the dest branch.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    // Tree: [5,1,2,3,null,6,4]; start = 3, dest = 6 → "UURL".
    // 3 is at L,L (index 3); 6 is at R,L (index 5). LCA = root 5.
    {
      id: 'dir1',
      label: 'start 3 → dest 6 = "UURL"',
      value: { tree: [5, 1, 2, 3, null, 6, 4], startValue: 3, destValue: 6 },
    },
    // Tree: [2,1,null]; start = 2, dest = 1 → "L".
    {
      id: 'dir2',
      label: 'start 2 → dest 1 = "L"',
      value: { tree: [2, 1, null], startValue: 2, destValue: 1 },
    },
  ] satisfies SampleInput<DirectionsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DirectionsState | undefined;
    if (!s || s.answer == null) return { ok: false, label: 'no path' };
    return { ok: true, label: `"${s.answer}"` };
  },
};
