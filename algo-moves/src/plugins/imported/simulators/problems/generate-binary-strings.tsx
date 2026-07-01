import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, PathDisplay, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface BinInput {
  n: number;
}

interface BinState {
  n: number;
  path: string; // current partial binary string
  results: string[];
  done: boolean;
}

function record({ n }: BinInput): Frame<BinState>[] {
  const frames: Frame<BinState>[] = [];
  const results: string[] = [];

  const emit = (type: string, note: string, caption: string, path: string, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { n, path, results: results.slice(), done: type === 'DONE' },
    });

  emit(
    'INIT',
    `n=${n}`,
    `Generate every binary string of length ${n}. At each position there are no constraints — branch on '0' first, then '1', and record once the string reaches length ${n}. There are 2^${n} = ${2 ** n} strings.`,
    '',
  );

  const bt = (path: string) => {
    if (path.length === n) {
      results.push(path);
      emit(
        'RECORD',
        `+"${path}"`,
        `Length reached ${n} — record the binary string "${path}" (${results.length} so far).`,
        path,
        'good',
      );
      return;
    }
    emit(
      'ZERO',
      `add '0'`,
      `Position ${path.length}: append '0' first and recurse. path = "${path}0".`,
      path + '0',
    );
    bt(path + '0');
    emit(
      'ONE',
      `add '1'`,
      `Position ${path.length}: now append '1' and recurse. path = "${path}1".`,
      path + '1',
    );
    bt(path + '1');
  };

  bt('');
  emit(
    'DONE',
    `${results.length} strings`,
    `All branches explored — ${results.length} binary strings of length ${n}.`,
    '',
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<BinState>) {
  const s = frame.state;
  return (
    <div className="board-area board-area--text">
      <div className={cn(vizText.sm, 'text-ink3')}>building binary strings · length {s.n}</div>
      <PathDisplay value={s.path || '·'} />
      <div className={cn(vizText.sm, 'text-ink2')}>
        {s.done ? 'all strings generated' : `${s.path.length} / ${s.n} bits placed`}
      </div>
      <div className={cn('mt-3 text-ink3', vizText.sm)}>
        binary strings found ({s.results.length})
        <div className="mt-1 flex flex-wrap gap-1.5">
          {s.results.map((r, i) => (
            <span key={i} className={cn('chip font-mono text-ink', vizText.sm)}>
              {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<BinState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="length n" v={s.n} />
      <InspectorRow k="path" v={`"${s.path}"`} />
      <InspectorRow k="found" v={s.results.length} />
      <InspectorRow k="target 2^n" v={2 ** s.n} />
    </VarGrid>
  );
}

export const manifestId = 'imp-32-generate-binary-strings';
export const title = 'Generate Binary Strings';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'n3', label: 'n = 3', value: { n: 3 } },
    { id: 'n2', label: 'n = 2', value: { n: 2 } },
  ] satisfies SampleInput<BinInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as BinState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} strings` };
  },
};
