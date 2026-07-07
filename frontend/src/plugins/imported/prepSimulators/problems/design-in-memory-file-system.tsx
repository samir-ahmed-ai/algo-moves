import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type FsOp =
  | { kind: 'ls'; path: string }
  | { kind: 'mkdir'; path: string }
  | { kind: 'add'; path: string; content: string }
  | { kind: 'read'; path: string };

interface FsInput {
  ops: FsOp[];
}

interface FsNode {
  children: Record<string, FsNode>;
  content: string;
  isFile: boolean;
}

interface FsState {
  tree: FsNode;
  op: string;
  result: string;
  listing: string[];
  done: boolean;
}

function emptyNode(): FsNode {
  return { children: {}, content: '', isFile: false };
}

function cloneNode(n: FsNode): FsNode {
  const children: Record<string, FsNode> = {};
  for (const [k, v] of Object.entries(n.children)) children[k]! = cloneNode(v);
  return { children, content: n.content, isFile: n.isFile };
}

function traverse(root: FsNode, path: string): FsNode {
  let cur = root;
  if (path === '/') return cur;
  for (const part of path.slice(1).split('/')) {
    if (!cur.children[part]!) cur.children[part]! = emptyNode();
    cur = cur.children[part]!;
  }
  return cur;
}

function ls(root: FsNode, path: string): string[] {
  const node = traverse(root, path);
  if (node.isFile) {
    const parts = path.split('/');
    return [parts[parts.length - 1]!];
  }
  return Object.keys(node.children).sort();
}

function record({ ops }: FsInput): Frame<FsState>[] {
  const root = emptyNode();

  const { emit, frames } = createPrepRecorder<FsState>(() => ({
    tree: cloneNode(root),
    op: '',
    result: '',
    listing: [],
    done: false,
  }));

  emit(
    'INIT',
    'root /',
    `In-Memory File System: trie of fsNodes. traverse() creates dirs on demand. Files append content; Ls returns sorted children or filename.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'mkdir') {
      traverse(root, o.path);
      emit('MKDIR', o.path, `Mkdir("${o.path}"): traverse creates missing directory nodes.`, {
        op: `mkdir ${o.path}`,
      });
    } else if (o.kind === 'add') {
      const node = traverse(root, o.path);
      node.isFile = true;
      node.content += o.content;
      emit(
        'ADD',
        o.path,
        `AddContentToFile("${o.path}", "${o.content}"): append to file content → "${node.content}".`,
        { op: `add ${o.path}`, result: node.content },
      );
    } else if (o.kind === 'read') {
      const content = traverse(root, o.path).content;
      emit(
        'READ',
        content,
        `ReadContentFromFile("${o.path}"): return "${content}".`,
        { op: `read ${o.path}`, result: content },
        'good',
      );
    } else {
      const listing = ls(root, o.path);
      emit(
        'LS',
        listing.join(', '),
        `Ls("${o.path}"): ${listing.length ? `[${listing.join(', ')}]` : 'empty'}.`,
        { op: `ls ${o.path}`, listing, result: listing.join(', ') },
      );
    }
  }

  emit('DONE', 'done', `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<FsState>) {
  const s = frame.state;
  const dirs = Object.keys(s.tree.children).sort();
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.result && <span className="ml-2 font-mono text-ink">&quot;{s.result}&quot;</span>}
      </div>
      {s.listing.length > 0 && (
        <div className={cn('mt-1', vizText.sm, 'text-ink3')}>ls: [{s.listing.join(', ')}]</div>
      )}
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>root /</div>
      <div className="mt-1 space-y-0.5 pl-2">
        {dirs.map((name) => {
          const child = s.tree.children[name]!;
          return (
            <div
              key={name}
              className={cn('font-mono', vizText.sm, child!.isFile ? 'text-accent' : 'text-ink')}
            >
              {child!.isFile ? `📄 ${name}: "${child!.content}"` : `📁 ${name}/`}
            </div>
          );
        })}
        {dirs.length === 0 && <span className={cn(vizText.sm, 'text-ink3')}>empty</span>}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<FsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="result" v={s.result || '—'} />
      <InspectorRow k="children" v={Object.keys(s.tree.children).length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-design-in-memory-file-system';
export const title = 'Design In-Memory File System';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Design In-Memory File System"?',
    choices: [
      {
        label: 'Design — fits this problem',
        correct: true,
      },
      {
        label: 'Two Heaps — different approach',
      },
      {
        label: 'Round-robin load balancer — different approach',
      },
      {
        label: 'Bijective tiny URL encode/decode — different approach',
      },
    ],
    explain: 'See Design In Memory File System pattern',
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
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'fs1',
      label: 'mkdir, add, ls, read',
      value: {
        ops: [
          { kind: 'mkdir', path: '/a/b' },
          { kind: 'add', path: '/a/b/c', content: 'hello' },
          { kind: 'add', path: '/a/b/c', content: ' world' },
          { kind: 'ls', path: '/a/b' },
          { kind: 'read', path: '/a/b/c' },
        ],
      },
    },
  ] satisfies SampleInput<FsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FsState | undefined;
    return s?.done ? { ok: true, label: 'done' } : { ok: false, label: 'incomplete' };
  },
};
