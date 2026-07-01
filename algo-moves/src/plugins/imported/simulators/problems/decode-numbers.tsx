import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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
  const frames: Frame<DecodeState>[] = [];
  const results: string[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    idx: number | null,
    span: number | null,
    path: string,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { digits, idx, span, path, results: results.slice(), done: type === 'DONE' },
    });

  emit(
    'INIT',
    `"${digits}"`,
    `Decode the digit string "${digits}" into letters where 1→A, 2→B, … 26→Z. At each position try taking 1 digit, then taking 2 digits (when 10–26), and recurse on the rest.`,
    0,
    null,
    '',
  );

  const decode = (idx: number, path: string) => {
    if (idx === digits.length) {
      results.push(path);
      emit(
        'RECORD',
        `+"${path}"`,
        `Reached the end of the string — record the decoding "${path}" (${results.length} so far).`,
        null,
        null,
        path,
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
          idx,
          len,
          path,
          'bad',
        );
        continue;
      }
      emit(
        'CHOOSE',
        `${code}→${letter}`,
        `Take ${len} digit${len > 1 ? 's' : ''} "${code}" at position ${idx} → "${letter}". Decoded prefix is now "${path + letter}"; recurse on the remaining "${digits.slice(idx + len) || '∅'}".`,
        idx,
        len,
        path + letter,
      );
      decode(idx + len, path + letter);
      emit(
        'BACKTRACK',
        `undo ${letter}`,
        `Backtrack: drop "${letter}" so the next branch decodes position ${idx} differently. Prefix is back to "${path || '∅'}".`,
        idx,
        len,
        path,
      );
    }
  };

  decode(0, '');
  emit(
    'DONE',
    `${results.length} decodings`,
    `All branches explored — "${digits}" has ${results.length} decoding${results.length === 1 ? '' : 's'}: ${results.map((r) => `"${r}"`).join(', ')}.`,
    null,
    null,
    '',
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<DecodeState>) {
  const s = frame.state;
  const chars = s.digits.split('');
  return (
    <div className="board-area board-area--text">
      <div className={cn(vizText.sm, 'text-ink3')}>
        decoded prefix · <span className="font-mono text-ink">{s.path || '∅'}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {chars.map((c, i) => {
          const active = s.idx !== null && s.span !== null && i >= s.idx && i < s.idx + s.span;
          const consumed = s.idx !== null && i < s.idx;
          return (
            <span
              key={i}
              className={cn('inline-flex h-7 w-7 items-center justify-center rounded font-mono', vizText.base)}
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
        {s.idx !== null && (
          <span className={cn('ml-2 text-ink3', vizText.xs)}>
            remaining: <span className="font-mono">{s.digits.slice(s.idx) || '∅'}</span>
          </span>
        )}
      </div>
      <div className={cn(vizText.sm, 'text-ink3')}>
        decodings found ({s.results.length})
        <div className="mt-1 flex flex-col gap-0.5">
          {s.results.map((r, i) => (
            <span key={i} className={cn('font-mono text-ink', vizText.sm)}>
              "{r}"
            </span>
          ))}
        </div>
      </div>
    </div>
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

export const simulator: DpSimulator = {
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
