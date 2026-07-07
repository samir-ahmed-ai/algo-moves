import type { ReactNode } from 'react';
import { createPrepRecorder } from '../strictHelpers';
import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface DirNode {
  name: string;
  children: DirNode[];
  files: string[];
}

interface CleanDirsInput {
  root: DirNode;
}

interface CleanDirsState {
  tree: DirNode;
  path: string[];
  activeDir: string | null;
  removed: string[];
  remaining: number;
  done: boolean;
}

function countEntries(node: DirNode): number {
  return node.files.length + node.children.length;
}

function record({ root }: CleanDirsInput): Frame<CleanDirsState>[] {
  const removed: string[] = [];

  const { emit, frames } = createPrepRecorder<CleanDirsState>(() => ({
    tree: root,
    path: [],
    activeDir: null,
    removed: removed.slice(),
    remaining: countEntries(root),
    done: false,
  }));

  const walk = (node: DirNode, path: string[]) => {
    const fullPath = path.length ? path.join('/') : node.name;
    emit(
      'READ',
      `ReadDir ${fullPath}`,
      `\`os.ReadDir(root)\` lists entries in "${fullPath}". Recurse into each subdirectory depth-first.`,
      { path: [...path], activeDir: fullPath, remaining: countEntries(node) },
    );

    for (const child of node.children) {
      walk(child, [...path, child.name]);
    }

    const remaining = countEntries(node);
    emit(
      'CHECK',
      `${remaining} entries left`,
      `After recursing children, re-read "${fullPath}": ${remaining} entr${remaining === 1 ? 'y' : 'ies'} remain.`,
      { path: [...path], activeDir: fullPath, remaining },
    );

    if (remaining === 0) {
      removed.push(fullPath);
      emit(
        'REMOVE',
        `Remove ${fullPath}`,
        `\`len(remaining) == 0\` — directory "${fullPath}" is empty, so \`os.Remove(root)\` deletes it.`,
        { path: [...path], activeDir: fullPath, remaining: 0 },
        'good',
      );
    }
  };

  emit(
    'INIT',
    'depth-first walk',
    `Clean directories recursively: DFS into each subdir, then if the directory has no remaining entries, remove it.`,
    { path: [root.name], activeDir: root.name },
  );

  walk(root, [root.name]);

  emit(
    'DONE',
    `${removed.length} removed`,
    `Walk complete. Removed ${removed.length} empty director${removed.length === 1 ? 'y' : 'ies'}: [${removed.join(', ')}].`,
    { removed: removed.slice(), done: true },
    'good',
  );
  return frames;
}

function renderTree(
  node: DirNode,
  path: string[],
  active: string | null,
  removed: Set<string>,
  depth = 0,
): ReactNode {
  const full = path.join('/');
  const isRemoved = removed.has(full);
  const isActive = active === full;
  return (
    <div key={full} style={{ marginLeft: depth * 12 }}>
      <span
        className={cn(
          'font-mono',
          vizText.sm,
          isActive ? 'text-accent' : isRemoved ? 'text-ink3 line-through' : 'text-ink',
        )}
      >
        📁 {node.name}
        {node.files.length > 0 && ` (${node.files.length} file${node.files.length > 1 ? 's' : ''})`}
      </span>
      {node.files.map((f) => (
        <div key={f} style={{ marginLeft: 12 }} className={cn('font-mono text-ink3', vizText.sm)}>
          📄 {f}
        </div>
      ))}
      {node.children.map((c) => renderTree(c, [...path, c.name], active, removed, depth + 1))}
    </div>
  );
}

function View({ frame }: PluginViewProps<CleanDirsState>) {
  const s = frame.state;
  const removedSet = new Set(s.removed);
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        active = <span className="font-mono text-ink">{s.activeDir ?? '—'}</span>
        {' · '}remaining entries = <span className="font-mono text-ink">{s.remaining}</span>
      </div>
      {renderTree(s.tree, [s.tree.name], s.activeDir, removedSet)}
      {s.removed.length > 0 && (
        <div className={cn('mt-2 font-mono text-good', vizText.sm)}>
          removed: [{s.removed.join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<CleanDirsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="active dir" v={s.activeDir ?? '—'} />
      <InspectorRow k="remaining" v={s.remaining} />
      <InspectorRow k="removed count" v={s.removed.length} />
      <InspectorRow k="last removed" v={s.removed[s.removed.length - 1]! ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-clean-directories-recursively';
export const title = 'Clean directories recursively';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Clean directories recursively"?',
    choices: [
      {
        label: 'Recursive directory walk — fits this problem',
        correct: true,
      },
      {
        label: 'Two heaps median — different approach',
      },
      {
        label: 'Buffered line iterator — different approach',
      },
      {
        label: 'Token bucket rate limiter — different approach',
      },
    ],
    explain: "Recurse depth-first; delete each directory once it's empty",
  },
  {
    id: 'key-step',
    prompt: 'On the "CHECK" step ( entries left), what happens?',
    choices: [
      {
        label: 'After recursing children, re-read "": entr — this move caption',
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
    explain: 'After recursing children, re-read "":  entr remain.',
  },
  {
    id: 'state',
    prompt: 'What does the `tree` field track in the visualization state?',
    choices: [
      {
        label: 'Field tree in state — updated each frame',
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
    explain:
      'The recorder snapshots `tree` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Clean directories recursively"?',
    choices: [
      {
        label: 'O(entries) time, O(depth) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(entries) time, O(matches) space — wrong order of growth',
      },
    ],
    explain: 'O(entries). O(depth). recurse children; if no entries remain -> Remove(root)',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Walk complete. Removed empty director: []. — final DONE caption',
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
    explain: 'Walk complete. Removed  empty director: [].',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'cd1',
      label: 'nested empty dirs',
      value: {
        root: {
          name: 'root',
          files: [],
          children: [
            { name: 'a', files: [], children: [{ name: 'b', files: [], children: [] }] },
            { name: 'keep', files: ['data.txt'], children: [] },
          ],
        },
      },
    },
    {
      id: 'cd2',
      label: 'single empty leaf',
      value: {
        root: {
          name: 'root',
          files: ['x.txt'],
          children: [{ name: 'empty', files: [], children: [] }],
        },
      },
    },
  ] satisfies SampleInput<CleanDirsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CleanDirsState | undefined;
    return s?.done
      ? { ok: true, label: `${s.removed.length} removed` }
      : { ok: false, label: 'incomplete' };
  },
};
