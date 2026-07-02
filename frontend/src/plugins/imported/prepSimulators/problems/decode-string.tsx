import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface DecodeInput {
  s: string;
}

interface DecodeState {
  s: string;
  i: number | null; // index of the char being processed (null before/after the scan)
  c: string | null; // the current char s[i]
  num: number; // digits accumulated so far (count for the next '[')
  cur: string; // string built at the current bracket depth
  cntStack: number[]; // saved counts, bottom -> top
  strStack: string[]; // saved partial strings, bottom -> top
  done: boolean;
}

function record({ s }: DecodeInput): Frame<DecodeState>[] {  const cntStack: number[] = [];
  const strStack: string[] = [];
  let cur = '';
  let num = 0;

  const { emit, frames } = createRecorder<DecodeState>(() => ({
        s: s,
        num: num,
        cur: cur,
        cntStack: cntStack.slice(),
        strStack: strStack.slice(),
        i: null,
        c: null,
        done: false
      }));

  emit('INIT', `decode "${s}"`, `Decode String: expand a pattern like k[...] into k copies of the inner string. We use two stacks — one for the repeat counts, one for the strings built so far — plus a running number "num" and the current string "cur".`, { i: null, c: null });

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c >= '0' && c <= '9') {
      num = num * 10 + (c.charCodeAt(0) - 48);
      emit('DIGIT', `num=${num}`, `'${c}' is a digit, so fold it into the running count: num = num*10 + ${c} = ${num}. This is how multi-digit repeat counts like "12[a]" are built.`, { i: i, c: c });
    } else if (c === '[') {
      cntStack.push(num);
      strStack.push(cur);
      const pushedNum = num;
      const pushedCur = cur;
      num = 0;
      cur = '';
      emit('[', `push ${pushedNum}, "${pushedCur}"`, `'[' opens a new group. Push the count ${pushedNum} onto the count stack and the string-so-far "${pushedCur || '∅'}" onto the string stack, then reset num=0 and cur="" to start collecting the inner string.`, { i: i, c: c });
    } else if (c === ']') {
      const k = cntStack[cntStack.length - 1];
      cntStack.pop();
      const prev = strStack[strStack.length - 1];
      strStack.pop();
      const inner = cur;
      cur = prev + inner.repeat(k);
      emit(']', `repeat ${k}×`, `']' closes the group. Pop count ${k} and the saved prefix "${prev || '∅'}", then set cur = "${prev || '∅'}" + ("${inner}" × ${k}) = "${cur}".`, { i: i, c: c });
    } else {
      cur += c;
      emit('CHAR', `cur="${cur}"`, `'${c}' is a plain letter, so append it to the current string: cur = "${cur}".`, { i: i, c: c });
    }
  }

  emit('DONE', `"${cur}"`, `End of input. Both stacks are empty and cur holds the fully decoded string: "${cur}".`, { i: null, c: null , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<DecodeState>) {
  const s = frame.state;
  return (
    <VizStage
      rail={
        <>
          <RailStack label="count stack" items={s.cntStack.map((n) => String(n))} />
          <RailStack label="string stack" items={s.strStack.map((v) => `"${v}"`)} />
          <RailGroup>
            <RailStat k="num" v={s.num} />
            <RailStat k="cur" v={`"${s.cur}"`} />
          </RailGroup>
          {s.done && <RailResult label="decoded" value={`"${s.cur}"`} />}
        </>
      }
    >
      <div className={cn('font-mono', vizText.base)}>
        {s.s.split('').map((ch, i) => (
          <span
            key={i}
            className={cn(
              'inline-block px-[2px]',
              i === s.i ? 'rounded bg-accentbg text-accent' : 'text-ink3',
            )}
          >
            {ch}
          </span>
        ))}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<DecodeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="char" v={s.c ?? '—'} />
      <InspectorRow k="num" v={s.num} />
      <InspectorRow k="cur" v={`"${s.cur}"`} />
      <InspectorRow k="count stack" v={s.cntStack.length ? `[${s.cntStack.join(', ')}]` : 'empty'} />
      <InspectorRow
        k="string stack"
        v={s.strStack.length ? s.strStack.map((v) => `"${v}"`).join(', ') : 'empty'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-stacks-queues-decode-string';
export const title = 'Decode String';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ds1', label: '"3[a2[c]]"', value: { s: '3[a2[c]]' } },
    { id: 'ds2', label: '"2[abc]3[cd]"', value: { s: '2[abc]3[cd]' } },
  ] satisfies SampleInput<DecodeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DecodeState | undefined;
    return s ? { ok: true, label: `"${s.cur}"` } : { ok: false, label: 'no result' };
  },
};
