import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface FindReplaceInput {
  s: string;
  indices: number[];
  sources: string[];
  targets: string[];
}

interface Op {
  src: string;
  tgt: string;
}

interface FindReplaceState {
  s: string; // original string as-is
  map: [number, string, string][]; // index -> (src, tgt) entries, for display
  i: number | null; // current scan index
  span: number; // how many chars from i the current attempt covers (source length)
  matched: boolean | null; // did the source prefix match at i? null when no op is anchored here
  op: Op | null; // op anchored at i (if any)
  result: string; // string built so far
  done: boolean;
}

function record({ s, indices, sources, targets }: FindReplaceInput): Frame<FindReplaceState>[] {  const m = new Map<number, Op>();
  for (let k = 0; k < indices.length; k++) {
    m.set(indices[k], { src: sources[k], tgt: targets[k] });
  }
  const mapEntries = (): [number, string, string][] =>
    [...m.entries()].sort((a, b) => a[0] - b[0]).map(([idx, o]) => [idx, o.src, o.tgt]);

  let result = '';

  const { emit, frames } = createRecorder<FindReplaceState>(() => ({
        s,
        map: mapEntries(),
        i: null,
        span: 0,
        matched: null,
        op: null,
        result,
        done: false
      }));

  emit(
    'INIT',
    `${indices.length} ops`,
    `Find and Replace in String: apply all replacements simultaneously against the ORIGINAL string. First build an index map so we can look up "does an operation start here?" in O(1). Then scan left to right.`,
    {},
  );

  for (let k = 0; k < indices.length; k++) {
    emit(
      'MAP',
      `map[${indices[k]}]="${sources[k]}"→"${targets[k]}"`,
      `Store operation: at index ${indices[k]}, if the substring equals "${sources[k]}" replace it with "${targets[k]}". Indexing lets each scan position check for an op instantly.`,
      { i: indices[k], op: { src: sources[k], tgt: targets[k] }, span: sources[k].length },
    );
  }

  let i = 0;
  while (i < s.length) {
    const o = m.get(i);
    if (o) {
      const fits = i + o.src.length <= s.length;
      const slice = fits ? s.slice(i, i + o.src.length) : '';
      const isMatch = fits && slice === o.src;
      emit(
        'CHECK',
        `s[${i}..]="${slice}" vs "${o.src}"`,
        `Index ${i} has an operation. Check the original substring "${slice}" against source "${o.src}". ${isMatch ? 'They match' : 'They do NOT match'}, so we ${isMatch ? 'perform the replacement' : 'skip the operation and copy the character'}.`,
        { i, op: o, span: o.src.length, matched: isMatch },
        isMatch ? 'good' : undefined,
      );
      if (isMatch) {
        result += o.tgt;
        emit(
          'REPLACE',
          `write "${o.tgt}", jump +${o.src.length}`,
          `Append target "${o.tgt}" to the result and advance i by len("${o.src}") = ${o.src.length}, skipping past the whole matched source.`,
          { i, op: o, span: o.src.length, matched: true, result },
          'good',
        );
        i += o.src.length;
        continue;
      }
    }
    result += s[i];
    emit(
      'COPY',
      `write '${s[i]}'`,
      `No replacement applies at index ${i}, so copy the original character '${s[i]}' to the result and advance by 1.`,
      { i, span: 1, matched: o ? false : null, op: o ?? null, result },
    );
    i += 1;
  }

  emit(
    'DONE',
    `→ "${result}"`,
    `Scan complete. Because every op was tested against the ORIGINAL string, the replacements never interfered with each other. Result: "${result}".`,
    { i: null, done: true, result },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<FindReplaceState>) {
  const s = frame.state;
  const chars = s.s.split('');
  const pointers: ArrayPointer[] = [];
  if (s.i !== null && s.i >= 0 && s.i < chars.length) {
    const tone: ArrayPointer['tone'] =
      s.matched === true ? 'good' : s.matched === false ? 'bad' : 'accent';
    pointers.push({ i: s.i, label: 'i', tone, place: 'above' });
  }
  const winStart = s.i;
  const winEnd = s.i !== null ? s.i + Math.max(0, s.span - 1) : null;
  const inWindow = (idx: number) =>
    winStart !== null && winEnd !== null && idx >= winStart && idx <= winEnd;
  const tone = (idx: number) => {
    if (s.matched === true && inWindow(idx)) return 'found';
    if (s.matched === false && idx === s.i) return 'dead';
    if (idx === s.i) return 'match';
    if (inWindow(idx)) return 'in-window';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        original string{s.op && !s.done && (
          <>
            {' · op at '}
            <span className="font-mono text-ink">{s.i}</span>: "
            <span className="font-mono text-ink">{s.op.src}</span>" → "
            <span className="font-mono text-ink">{s.op.tgt}</span>"
          </>
        )}
      </div>
      <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        map {'{'}
        {s.map.map(([idx, src, tgt]) => `${idx}:"${src}"→"${tgt}"`).join(', ')}
        {'}'}
      </div>
      <div className={cn('mt-1 font-mono', s.done ? 'text-good' : 'text-ink', vizText.base)}>
        result: {s.result === '' ? '·' : `"${s.result}"`}
        {s.done && ' ✓'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<FindReplaceState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="char at i" v={s.i !== null && s.i < s.s.length ? `'${s.s[s.i]}'` : '—'} />
      <InspectorRow k="op source" v={s.op ? `"${s.op.src}"` : '—'} />
      <InspectorRow k="op target" v={s.op ? `"${s.op.tgt}"` : '—'} />
      <InspectorRow k="match?" v={s.matched === null ? '—' : s.matched ? 'yes' : 'no'} />
      <InspectorRow k="map size" v={s.map.length} />
      <InspectorRow k="result" v={`"${s.result}"`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-find-and-replace-in-string';
export const title = 'Find and Replace in String';

function compute(input: FindReplaceInput): string {
  const m = new Map<number, Op>();
  for (let k = 0; k < input.indices.length; k++) {
    m.set(input.indices[k], { src: input.sources[k], tgt: input.targets[k] });
  }
  let out = '';
  let i = 0;
  while (i < input.s.length) {
    const o = m.get(i);
    if (o && i + o.src.length <= input.s.length && input.s.slice(i, i + o.src.length) === o.src) {
      out += o.tgt;
      i += o.src.length;
    } else {
      out += input.s[i];
      i += 1;
    }
  }
  return out;
}

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'fr1',
      label: '"abcd", [0,2] "a"/"cd"→"eee"/"ffff"',
      value: { s: 'abcd', indices: [0, 2], sources: ['a', 'cd'], targets: ['eee', 'ffff'] },
    },
    {
      id: 'fr2',
      label: '"abcd", [0,2] "ab"/"ec" no-match',
      value: { s: 'abcd', indices: [0, 2], sources: ['ab', 'ec'], targets: ['eee', 'ffff'] },
    },
  ] satisfies SampleInput<FindReplaceInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FindReplaceState | undefined;
    return s ? { ok: true, label: `"${s.result}"` } : { ok: false, label: 'no result' };
  },
};

// Reference the pure computer so lint keeps it (parity check with the Go solution).
void compute;
