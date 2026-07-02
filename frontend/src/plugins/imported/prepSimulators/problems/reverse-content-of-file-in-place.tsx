import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ReverseFileInput {
  content: string;
}

interface ReverseFileState {
  bytes: string[];
  i: number | null;
  j: number | null;
  done: boolean;
}

function record({ content }: ReverseFileInput): Frame<ReverseFileState>[] {
  const bytes = content.split('');  let i = 0;
  let j = bytes.length - 1;

  const { emit, frames } = createRecorder<ReverseFileState>(() => ({
        bytes: bytes.slice(),
        i,
        j,
        done: false
      }));

  emit(
    'READ',
    `${bytes.length} bytes`,
    `\`os.ReadFile(path)\` loads all bytes into memory. Two pointers \`i\` (start) and \`j\` (end) will swap toward the center.`,
    { i, j },
  );

  while (i < j) {
    emit(
      'SWAP',
      `'${bytes[i]}'↔'${bytes[j]}'`,
      `Swap bytes at indices ${i} and ${j}: '${bytes[i]}' ↔ '${bytes[j]}', then move i++ and j--.`,
      { i, j },
    );
    [bytes[i], bytes[j]] = [bytes[j], bytes[i]];
    i++;
    j--;
    emit(
      'ADVANCE',
      `i=${i} j=${j}`,
      `Pointers advanced. ${i < j ? 'More swaps remain.' : 'Pointers crossed — reversal complete.'}`,
      { i, j },
    );
  }

  emit(
    'WRITE',
    'WriteFile',
    `\`os.WriteFile(path, data, 0644)\` writes the reversed bytes back to disk in place.`,
    { i, j, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ReverseFileState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.j !== null && s.j !== s.i) pointers.push({ i: s.j, label: 'j', tone: 'warn', place: 'above' });
  const tone = (idx: number) => {
    if (s.i === idx || s.j === idx) return 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        in-place reversal · i={s.i ?? '—'} j={s.j ?? '—'}
      </div>
      <ArrayRow values={s.bytes} cellTone={tone} pointers={pointers} windowRange={null} />
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → &quot;{s.bytes.join('')}&quot;
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ReverseFileState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="j" v={s.j ?? '—'} />
      <InspectorRow k="len" v={s.bytes.length} />
      <InspectorRow k="result" v={s.done ? s.bytes.join('') : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-reverse-content-of-file-in-place';
export const title = 'Reverse content of file in place';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'rc1', label: '"hello"', value: { content: 'hello' } },
    { id: 'rc2', label: '"abcd"', value: { content: 'abcd' } },
  ] satisfies SampleInput<ReverseFileInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ReverseFileState | undefined;
    if (!s?.done) return { ok: false, label: 'incomplete' };
    return { ok: true, label: `"${s.bytes.join('')}"` };
  },
};
