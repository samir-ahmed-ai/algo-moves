import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { NaryTreeBoard, type NaryNode } from '../../../../components/board/NaryTreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PaliInput {
  s: string;
}

interface PaliState {
  s: string;
  nodes: NaryNode[]; // flat trie: node 0 is the empty-string root
  path: string[]; // path string (root -> current node) per node index
  current: number | null; // trie node index being visited
  visited: boolean[]; // nodes already popped from the DFS
  counted: number[]; // node indices whose path was counted as a new palindrome
  candidate: string | null; // the path string tested at the current node
  isPali: boolean | null; // was the candidate a palindrome?
  isNew: boolean | null; // was it a palindrome we had not seen before?
  seen: string[]; // distinct palindromes collected so far
  count: number; // running answer
  done: boolean;
}

/** A trie node during construction: label + child map keyed by character. */
interface BuildNode {
  label: string;
  path: string;
  children: Map<string, number>;
}

function isPalindrome(str: string): boolean {
  for (let i = 0, j = str.length - 1; i < j; i++, j--) {
    if (str[i] !== str[j]) return false;
  }
  return true;
}

/** Build the suffix trie as a flat node list (node 0 = root, path ""). */
function buildSuffixTrie(s: string): { nodes: NaryNode[]; paths: string[] } {
  const build: BuildNode[] = [{ label: 'ε', path: '', children: new Map<string, number>() }];
  for (let i = 0; i < s.length; i++) {
    let node = 0;
    for (let j = i; j < s.length; j++) {
      const ch = s[j];
      const existing = build[node].children.get(ch);
      if (existing === undefined) {
        const idx = build.length;
        build.push({ label: ch, path: build[node].path + ch, children: new Map<string, number>() });
        build[node].children.set(ch, idx);
        node = idx;
      } else {
        node = existing;
      }
    }
  }
  const nodes: NaryNode[] = build.map((b) => ({
    label: b.label,
    children: [...b.children.values()],
  }));
  const paths = build.map((b) => b.path);
  return { nodes, paths };
}

function record({ s }: PaliInput): Frame<PaliState>[] {  const { nodes, paths } = buildSuffixTrie(s);
  const visited = new Array<boolean>(nodes.length).fill(false);
  const counted: number[] = [];
  const seen: string[] = [];
  let count = 0;

  const { emit, frames } = createRecorder<PaliState>(() => ({
        s,
        nodes,
        path: paths,
        current: null,
        visited: visited.slice(),
        counted: counted.slice(),
        candidate: null,
        isPali: null,
        isNew: null,
        seen: seen.slice(),
        count,
        done: false
      }));

  emit(
    'INIT',
    `s="${s}"`,
    `Find distinct palindromic substrings of "${s}". We insert every suffix into a suffix trie so that each root→node path spells a distinct substring, then DFS the trie and count the paths that are palindromes.`,
    {},
  );

  emit(
    'BUILD',
    `${nodes.length - 1} edges`,
    `The suffix trie is built. Every path from the root ε down to a node spells one substring of "${s}"; identical substrings share nodes, so each path is unique. Now we walk the tree in DFS order.`,
    {},
  );

  // Iterative pre-order DFS mirroring findPaliSub, so we can emit a frame per node.
  const stack: number[] = [0];
  while (stack.length > 0) {
    const node = stack.pop()!;
    const candidate = paths[node];

    const pali = candidate !== '' && isPalindrome(candidate);
    const fresh = pali && !seen.includes(candidate);

    if (node === 0) {
      emit(
        'VISIT',
        'root ε',
        `Start at the root, whose path is the empty string. The empty string is not counted, so we just descend into its children.`,
        { current: 0, candidate: '' },
      );
    } else if (!pali) {
      emit(
        'VISIT',
        `"${candidate}" ✗`,
        `Visit the node whose path spells "${candidate}". Reading it forwards and backwards differs, so it is not a palindrome — skip it and keep exploring deeper paths.`,
        { current: node, candidate, isPali: false, isNew: false },
      );
    } else if (fresh) {
      seen.push(candidate);
      counted.push(node);
      count++;
      emit(
        'COUNT',
        `"${candidate}" #${count}`,
        `The path "${candidate}" reads the same both ways, and we have not seen it before — record it as distinct palindrome #${count} and increment the count.`,
        { current: node, candidate, isPali: true, isNew: true },
        'good',
      );
    } else {
      emit(
        'DUP',
        `"${candidate}" dup`,
        `The path "${candidate}" is a palindrome, but it is already in our set of seen palindromes, so we do not count it again.`,
        { current: node, candidate, isPali: true, isNew: false },
      );
    }

    visited[node] = true;
    // Push children in reverse so they pop left-to-right (stable, readable order).
    const kids = nodes[node].children;
    for (let k = kids.length - 1; k >= 0; k--) stack.push(kids[k]);
  }

  emit(
    'DONE',
    `${count} distinct`,
    `The DFS is complete. We found ${count} distinct palindromic substring${count === 1 ? '' : 's'} of "${s}"${seen.length ? `: ${seen.map((p) => `"${p}"`).join(', ')}` : ''}.`,
    { current: null, count, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<PaliState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    if (s.current === i) return 'team-1';
    if (s.counted.includes(i)) return 'team-2';
    if (s.visited[i]) return 'team-2';
    return 'team-0';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        s = <span className="font-mono text-ink">"{s.s}"</span>
        {' · count = '}
        <span className="font-mono text-good">{s.count}</span>
      </div>
      <NaryTreeBoard
        nodes={s.nodes}
        nodeClass={nodeClass}
        activeNode={s.current}
        highlightNode={s.current !== null && s.current !== 0 ? s.current : null}
      />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.candidate !== null && s.candidate !== '' ? (
          <>
            path ={' '}
            <span
              className={cn(
                s.isNew ? 'text-good' : s.isPali ? 'text-ink' : 'text-ink3',
              )}
            >
              "{s.candidate}"
            </span>
            {s.isPali !== null && (
              <span className="text-ink3">{s.isPali ? ' · palindrome' : ' · not palindrome'}</span>
            )}
          </>
        ) : (
          <span className="text-ink3">path = ε (root)</span>
        )}
      </div>
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        palindromes {'{'}
        {s.seen.map((p) => `"${p}"`).join(', ')}
        {'}'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PaliState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="s" v={`"${s.s}"`} />
      <InspectorRow k="trie nodes" v={s.nodes.length} />
      <InspectorRow k="current path" v={s.candidate !== null ? (s.candidate === '' ? 'ε' : `"${s.candidate}"`) : '—'} />
      <InspectorRow k="palindrome?" v={s.isPali === null ? '—' : s.isPali ? 'yes' : 'no'} />
      <InspectorRow k="new?" v={s.isNew === null ? '—' : s.isNew ? 'yes' : 'no'} />
      <InspectorRow k="distinct count" v={s.count} />
    </VarGrid>
  );
}

export const manifestId = 'prep-tries-find-distinct-palindromic-sub';
export const title = 'Find distinct palindromic sub-';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'aba', label: 's = "aba"', value: { s: 'aba' } },
    { id: 'aabb', label: 's = "aabb"', value: { s: 'aabb' } },
  ] satisfies SampleInput<PaliInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PaliState | undefined;
    const n = s?.count ?? 0;
    return { ok: true, label: `${n} distinct palindrome${n === 1 ? '' : 's'}` };
  },
};
