import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface FileLineInput {
  content: string;
}

interface FileLineState {
  lines: string[];
  lineIdx: number | null;
  current: string | null;
  output: string[];
  hasNext: boolean;
  done: boolean;
}

function record({ content }: FileLineInput): Frame<FileLineState>[] {
  const lines = content.split('\n');  const output: string[] = [];
  let lineIdx = -1;

  const { emit, frames } = createRecorder<FileLineState>(() => ({
        lines,
        lineIdx: lineIdx >= 0 ? lineIdx : null,
        current: null,
        output: output.slice(),
        hasNext: lineIdx + 1 < lines.length,
        done: false
      }));

  emit(
    'INIT',
    'open file',
    `File line iterator: \`os.Open\` the path, wrap the file in \`bufio.NewScanner\`. \`hasNext()\` calls \`scanner.Scan()\`; \`next()\` returns \`scanner.Text()\`.`,
    { hasNext: lines.length > 0 },
  );

  while (lineIdx + 1 < lines.length) {
    lineIdx++;
    const hasNext = lineIdx + 1 < lines.length;
    emit(
      'HASNEXT',
      'Scan() = true',
      `\`hasNext()\`: \`scanner.Scan()\` succeeds — there is another line at index ${lineIdx}.`,
      { lineIdx, hasNext, current: lines[lineIdx] },
    );
    output.push(lines[lineIdx]);
    emit(
      'NEXT',
      `line ${lineIdx + 1}`,
      `\`next()\` returns \`scanner.Text()\` = "${lines[lineIdx]}". Yielded lines so far: [${output.map((l) => `"${l}"`).join(', ')}].`,
      { lineIdx, current: lines[lineIdx], hasNext: lineIdx + 1 < lines.length },
      'good',
    );
  }

  emit(
    'DONE',
    `${output.length} lines`,
    `\`hasNext()\` is false — scanner exhausted. Iterated ${output.length} line(s).`,
    { hasNext: false, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<FileLineState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        hasNext = <span className="font-mono text-ink">{s.hasNext ? 'true' : 'false'}</span>
        {s.current !== null && (
          <>
            {' · '}current = <span className="font-mono text-accent">&quot;{s.current}&quot;</span>
          </>
        )}
      </div>
      <div className="space-y-1">
        {s.lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              'rounded border px-2 py-1 font-mono',
              vizText.sm,
              s.lineIdx === i ? 'border-accent bg-accentbg text-accent' : i < (s.lineIdx ?? -1) ? 'border-line bg-surface2 text-ink3' : 'border-line text-ink',
            )}
          >
            {i + 1}: {line || '(empty line)'}
          </div>
        ))}
      </div>
      <div className={cn('mt-2 font-mono', vizText.sm, s.done ? 'text-good' : 'text-ink3')}>
        yielded [{s.output.map((l) => `"${l}"`).join(', ')}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<FileLineState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="line idx" v={s.lineIdx ?? '—'} />
      <InspectorRow k="hasNext" v={s.hasNext ? 'true' : 'false'} />
      <InspectorRow k="yielded" v={s.output.length} />
      <InspectorRow k="total lines" v={s.lines.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-file-line-iterator';
export const title = 'File line iterator';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'fli1', label: '3 lines', value: { content: 'alpha\nbeta\ngamma' } },
    { id: 'fli2', label: '2 lines', value: { content: 'hello\nworld' } },
  ] satisfies SampleInput<FileLineInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FileLineState | undefined;
    return s?.done ? { ok: true, label: `${s.output.length} lines` } : { ok: false, label: 'incomplete' };
  },
};
