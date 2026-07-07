import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  RailStack,
  InspectorRow,
  VarGrid,
  VizEmpty,
  vizText,
} from '../../../_shared/vizKit';

interface DecodeInput {
  digits: string;
}

interface DecodeState {
  digits: string;
  idx: number | null; // position currently being decoded
  span: number | null; // how many digits the active key consumes (1 or 2)
  path: string; // decoded letters so far
  results: string[];
  done: boolean;
}

// 1 -> 'A' ... 26 -> 'Z'. A key matches if the substring is a valid code 1..26.
function letterFor(code: string): string | null {
  if (code.length === 0 || code[0] === '0') return null;
  const n = Number(code);
  if (n < 1 || n > 26) return null;
  return String.fromCharCode(64 + n);
}

function record({ digits }: DecodeInput): Frame<DecodeState>[] {
  const results: string[] = [];

  const { emit, frames } = createRecorder<DecodeState>(() => ({
    digits: digits,
    results: results.slice(),
    idx: null,
    span: null,
    path: '',
    done: false,
  }));

  emit(
    'INIT',
    `"${digits}"`,
    `Decode the digit string "${digits}" into letters where 1→A, 2→B, … 26→Z. At each position try taking 1 digit, then taking 2 digits (when 10–26), and recurse on the rest.`,
    { idx: 0, span: null, path: '' },
  );

  const decode = (idx: number, path: string) => {
    if (idx === digits.length) {
      results.push(path);
      emit(
        'RECORD',
        `+"${path}"`,
        `Reached the end of the string — record the decoding "${path}" (${results.length} so far).`,
        { idx: null, span: null, path: path },
        'good',
      );
      return;
    }
    for (const len of [1, 2]) {
      if (idx + len > digits.length) continue;
      const code = digits.slice(idx, idx + len);
      const letter = letterFor(code);
      if (letter === null) {
        emit(
          'SKIP',
          `${code} ✗`,
          `Take ${len} digit${len > 1 ? 's' : ''} "${code}" at position ${idx}: ${code} is not in 1–26, so it maps to no letter — skip this branch.`,
          { idx: idx, span: len, path: path },
          'bad',
        );
        continue;
      }
      emit(
        'CHOOSE',
        `${code}→${letter}`,
        `Take ${len} digit${len > 1 ? 's' : ''} "${code}" at position ${idx} → "${letter}". Decoded prefix is now "${path + letter}"; recurse on the remaining "${digits.slice(idx + len) || '∅'}".`,
        { idx: idx, span: len, path: path + letter },
      );
      decode(idx + len, path + letter);
      emit(
        'BACKTRACK',
        `undo ${letter}`,
        `Backtrack: drop "${letter}" so the next branch decodes position ${idx} differently. Prefix is back to "${path || '∅'}".`,
        { idx: idx, span: len, path: path },
      );
    }
  };

  decode(0, '');
  emit(
    'DONE',
    `${results.length} decodings`,
    `All branches explored — "${digits}" has ${results.length} decoding${results.length === 1 ? '' : 's'}: ${results.map((r) => `"${r}"`).join(', ')}.`,
    { idx: null, span: null, path: '', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<DecodeState>) {
  const s = frame.state;
  const chars = s.digits.split('');
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="prefix" v={s.path || '∅'} tone="accent" />
        <RailStat k="remaining" v={s.idx !== null ? s.digits.slice(s.idx) || '∅' : '—'} />
      </RailGroup>
      <RailStack label="decodings" items={s.results.map((r) => `"${r}"`)} topLabel="latest" />
      {s.done && (
        <RailResult
          label="total"
          value={s.results.length}
          tone={s.results.length > 0 ? 'good' : 'bad'}
        />
      )}
    </>
  );
  return (
    <VizStage rail={rail}>
      <div className="flex flex-wrap items-center gap-1">
        {chars.map((c, i) => {
          const active = s.idx !== null && s.span !== null && i >= s.idx && i < s.idx + s.span;
          const consumed = s.idx !== null && i < s.idx;
          return (
            <span
              key={i}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded font-mono',
                vizText.base,
              )}
              style={{
                background: active ? 'var(--accent-bg)' : 'var(--surface-2)',
                color: consumed ? 'var(--text-3)' : 'var(--text)',
                outline: active ? '1px solid var(--accent)' : 'none',
              }}
            >
              {c}
            </span>
          );
        })}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<DecodeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="digits" v={`"${s.digits}"`} />
      <InspectorRow k="position" v={s.idx ?? '—'} />
      <InspectorRow k="prefix" v={`"${s.path}"`} />
      <InspectorRow k="remaining" v={s.idx !== null ? `"${s.digits.slice(s.idx)}"` : '—'} />
      <InspectorRow k="found" v={s.results.length} />
    </VarGrid>
  );
}

export const manifestId = 'imp-30-decode-numbers';
export const title = 'Decode Numbers';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: '12', label: '"12"', value: { digits: '12' } },
    { id: '226', label: '"226"', value: { digits: '226' } },
  ] satisfies SampleInput<DecodeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DecodeState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} decodings` };
  },
};
