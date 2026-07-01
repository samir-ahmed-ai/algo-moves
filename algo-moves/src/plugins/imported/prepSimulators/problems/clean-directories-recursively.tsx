import type { ReactNode } from 'react';
import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
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
  const frames: Frame<CleanDirsState>[] = [];
  const removed: string[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<CleanDirsState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree: root,
        path: [],
        activeDir: null,
        removed: removed.slice(),
        remaining: countEntries(root),
        done: false,
        ...s,
      },
    });

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

function renderTree(node: DirNode, path: string[], active: string | null, removed: Set<string>, depth = 0): ReactNode {
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
      <InspectorRow k="last removed" v={s.removed[s.removed.length - 1] ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-clean-directories-recursively';
export const title = 'Clean directories recursively';

export const simulator: ProblemSimulator = {
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
    return s?.done ? { ok: true, label: `${s.removed.length} removed` } : { ok: false, label: 'incomplete' };
  },
};
