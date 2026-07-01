import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MinAddInput {
  s: string;
}

interface MinAddState {
  chars: string[];
  i: number | null; // current index being scanned
  open: number; // unmatched '(' waiting for a partner
  close: number; // ')' with no partner → must insert a '(' before it
  action: 'open+' | 'match' | 'close+' | null; // what happened at this step
  done: boolean;
}

function record({ s }: MinAddInput): Frame<MinAddState>[] {
  const chars = s.split('');
  const frames: Frame<MinAddState>[] = [];
  let open = 0;
  let close = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    st: Partial<MinAddState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        chars,
        i: null,
        open,
        close,
        action: null,
        done: false,
        ...st,
      },
    });

  emit(
    'INIT',
    `"${s}"`,
    `Minimum Add to Make Parentheses Valid: scan left to right with two counters. open = unmatched '(' still waiting for a ')'; close = orphan ')' that has no '(' to its left. The answer is open + close. Time O(n), Space O(1).`,
    {},
  );

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === '(') {
      open++;
      emit(
        'OPEN',
        `open=${open}`,
        `Char ${i} is '(' — a new unmatched open. Increment open to ${open}; it now waits for a future ')' to close it.`,
        { i, action: 'open+' },
      );
    } else if (open > 0) {
      open--;
      emit(
        'MATCH',
        `open=${open}`,
        `Char ${i} is ')' and there is a waiting '(' (open was ${open + 1}). They pair up, so decrement open to ${open}. No insertion needed.`,
        { i, action: 'match' },
      );
    } else {
      close++;
      emit(
        'CLOSE',
        `close=${close}`,
        `Char ${i} is ')' but open is 0 — nothing to match it. This ')' is an orphan, so we must insert a '(' before it: increment close to ${close}.`,
        { i, action: 'close+' },
        'bad',
      );
    }
  }

  const answer = open + close;
  emit(
    'DONE',
    `${answer} to add`,
    `Scan finished. ${open} '(' are still unmatched (each needs a ')') and ${close} ')' were orphans (each needed a '('). Minimum insertions = open + close = ${open} + ${close} = ${answer}.`,
    { done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MinAddState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) {
    const tone: ArrayPointer['tone'] =
      s.action === 'close+' ? 'bad' : s.action === 'match' ? 'good' : 'accent';
    pointers.push({ i: s.i, label: 'i', tone, place: 'above' });
  }
  const tone = (i: number) => {
    if (s.i !== i) return '';
    if (s.action === 'match') return 'found';
    if (s.action === 'close+') return 'dead';
    return 'match';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        open = <span className="font-mono text-ink">{s.open}</span>
        {' · '}close = <span className="font-mono text-ink">{s.close}</span>
        {' · '}to add ={' '}
        <span className="font-mono text-ink">{s.open + s.close}</span>
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → insert {s.open + s.close} parenthes{s.open + s.close === 1 ? 'is' : 'es'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MinAddState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="s[i]" v={s.i !== null ? s.chars[s.i] : '—'} />
      <InspectorRow k="open (unmatched '(')" v={s.open} />
      <InspectorRow k="close (orphan ')')" v={s.close} />
      <InspectorRow k="to add (open+close)" v={s.open + s.close} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-minimum-add-to-make-parentheses-valid';
export const title = 'Minimum Add to Make Parentheses Valid';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'maq1', label: '"())"', value: { s: '())' } },
    { id: 'maq2', label: '"((("', value: { s: '(((' } },
  ] satisfies SampleInput<MinAddInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MinAddState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    const n = s.open + s.close;
    return { ok: true, label: `${n} to add` };
  },
};
