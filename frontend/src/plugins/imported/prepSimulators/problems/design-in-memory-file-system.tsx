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
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  RailStack,
  vizText,
} from '../../../_shared/vizKit';

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
  activePath: string[];
  created: boolean;
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

function pathParts(path: string): string[] {
  if (path === '/') return [];
  return path
    .slice(1)
    .split('/')
    .filter((p) => p.length > 0);
}

function find(root: FsNode, path: string): FsNode | null {
  let cur = root;
  if (path === '/') return cur;
  for (const part of pathParts(path)) {
    const child = cur.children[part];
    if (!child) return null;
    cur = child;
  }
  return cur;
}

function ls(root: FsNode, path: string): string[] | null {
  const node = find(root, path);
  if (!node) return null;
  if (node.isFile) {
    const clean = path.endsWith('/') ? path.slice(0, -1) : path;
    const parts = clean.split('/');
    return [parts[parts.length - 1]!];
  }
  return Object.keys(node.children).sort();
}

function countNodes(node: FsNode): number {
  let n = 1;
  for (const child of Object.values(node.children)) n += countNodes(child);
  return n;
}

type EmitFn = (
  type: string,
  note: string,
  caption: string,
  partial?: Partial<FsState>,
  tone?: 'good' | 'bad',
) => void;

function walkPath(
  root: FsNode,
  path: string,
  mutate: boolean,
  emit: EmitFn,
  opLabel: string,
): FsNode | null {
  if (path === '/') {
    emit('WALK', '/', `At root /.`, { activePath: [], op: opLabel });
    return root;
  }

  let cur = root;
  const walked: string[] = [];
  for (const part of pathParts(path)) {
    walked.push(part);
    if (mutate) {
      if (!cur.children[part]) {
        cur.children[part] = emptyNode();
        emit(
          'CREATE',
          part,
          `No "${part}" under /${walked.slice(0, -1).join('/') || ''} — create directory node.`,
          { activePath: walked.slice(), created: true, op: opLabel },
          'good',
        );
      } else {
        emit('WALK', part, `Descend into "${part}" (already exists).`, {
          activePath: walked.slice(),
          created: false,
          op: opLabel,
        });
      }
      cur = cur.children[part]!;
    } else {
      const child = cur.children[part];
      if (!child) {
        emit(
          'MISS',
          part,
          `Path segment "${part}" not found — read stops here.`,
          { activePath: walked.slice(), created: false, op: opLabel },
          'bad',
        );
        return null;
      }
      emit('WALK', part, `Descend into "${part}".`, {
        activePath: walked.slice(),
        created: false,
        op: opLabel,
      });
      cur = child;
    }
  }
  return cur;
}

function record({ ops }: FsInput): Frame<FsState>[] {
  const root = emptyNode();

  const { emit, frames } = createPrepRecorder<FsState>(() => ({
    tree: cloneNode(root),
    op: '',
    result: '',
    listing: [],
    activePath: [],
    created: false,
    done: false,
  }));

  emit(
    'INIT',
    'root /',
    `In-Memory File System: trie of fsNodes. ensureDir() creates dirs on write; find() walks read-only. Files append content; Ls returns sorted children or filename.`,
    { activePath: [] },
  );

  for (const o of ops) {
    if (o.kind === 'mkdir') {
      const label = `mkdir ${o.path}`;
      walkPath(root, o.path, true, emit, label);
      emit('MKDIR', o.path, `Mkdir("${o.path}"): ensureDir created any missing directory nodes.`, {
        op: label,
        activePath: pathParts(o.path),
        created: false,
      });
    } else if (o.kind === 'add') {
      const label = `add ${o.path}`;
      const node = walkPath(root, o.path, true, emit, label);
      if (node) {
        node.isFile = true;
        node.content += o.content;
        emit(
          'ADD',
          o.path,
          `AddContentToFile("${o.path}", "${o.content}"): append → "${node.content}".`,
          { op: label, result: node.content, activePath: pathParts(o.path), created: false },
        );
      }
    } else if (o.kind === 'read') {
      const label = `read ${o.path}`;
      const node = walkPath(root, o.path, false, emit, label);
      const content = node?.content ?? '';
      emit(
        'READ',
        content,
        `ReadContentFromFile("${o.path}"): return "${content}".`,
        { op: label, result: content, activePath: pathParts(o.path), created: false },
        'good',
      );
    } else {
      const label = `ls ${o.path}`;
      walkPath(root, o.path, false, emit, label);
      const listing = ls(root, o.path) ?? [];
      emit(
        'LS',
        listing.join(', '),
        `Ls("${o.path}"): ${listing.length ? `[${listing.join(', ')}]` : 'empty'}.`,
        {
          op: label,
          listing,
          result: listing.join(', '),
          activePath: pathParts(o.path),
          created: false,
        },
      );
    }
  }

  emit('DONE', 'done', `Done.`, { op: 'done', done: true, activePath: [] }, 'good');
  return frames;
}

function isActivePath(activePath: string[], depth: number, name: string): boolean {
  return activePath.length === depth + 1 && activePath[depth] === name;
}

function TreeLines({
  node,
  activePath,
  depth = 0,
  prefix = '',
}: {
  node: FsNode;
  activePath: string[];
  depth?: number;
  prefix?: string;
}) {
  const names = Object.keys(node.children).sort();
  if (names.length === 0 && depth === 0) {
    return <span className={cn(vizText.sm, 'text-ink3')}>empty</span>;
  }
  return (
    <>
      {names.map((name) => {
        const child = node.children[name]!;
        const active = isActivePath(activePath, depth, name);
        return (
          <div key={`${prefix}${name}`}>
            <div
              className={cn(
                'font-mono',
                vizText.sm,
                child.isFile ? 'text-accent' : 'text-ink',
                active && 'rounded bg-accent/10 px-1',
              )}
            >
              {child.isFile ? `📄 ${name}: "${child.content}"` : `📁 ${name}/`}
            </div>
            {!child.isFile && Object.keys(child.children).length > 0 && (
              <div className="pl-3">
                <TreeLines
                  node={child}
                  activePath={activePath}
                  depth={depth + 1}
                  prefix={`${prefix}${name}/`}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function View({ frame }: PluginViewProps<FsState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
      </RailGroup>
      {s.result !== '' && (
        <RailGroup label="result">
          <RailStat k="val" v={`"${s.result}"`} tone="good" />
        </RailGroup>
      )}
      {s.listing.length > 0 && <RailStack label="ls" items={s.listing} empty="∅" />}
      <RailGroup label="path">
        <RailStat
          k="cwd"
          v={s.activePath.length ? `/${s.activePath.join('/')}` : '/'}
          tone={s.created ? 'good' : undefined}
        />
        {s.created && <RailStat k="note" v="+created" tone="good" />}
      </RailGroup>
      <RailGroup label="fs">
        <RailStat k="nodes" v={countNodes(s.tree)} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className={cn(vizText.sm, 'text-ink3')}>root /</div>
      <div className="mt-1 space-y-0.5 pl-2">
        <TreeLines node={s.tree} activePath={s.activePath} />
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<FsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="result" v={s.result || '—'} />
      <InspectorRow k="nodes" v={countNodes(s.tree)} />
      <InspectorRow k="path" v={s.activePath.length ? `/${s.activePath.join('/')}` : '/'} />
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
      'The recorder snapshots `tree` on every emit so each frame shows the trie mid-step along the active path.',
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
