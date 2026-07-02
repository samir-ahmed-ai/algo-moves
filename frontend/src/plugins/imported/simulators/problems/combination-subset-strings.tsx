import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty, vizText, CharCell } from '../../../_shared/vizKit';

interface CSSInput {
  chars: string;
  k: number;
}

interface CSSState {
  chars: string;
  k: number;
  path: string; // current partial string
  active: string | null; // char just placed/considered
  results: string[];
  done: boolean;
}

function record({ chars, k }: CSSInput): Frame<CSSState>[] {  const charset = [...chars];
  let path = '';
  const results: string[] = [];

  const { emit, frames } = createRecorder<CSSState>(() => ({
        chars: chars,
        k: k,
        path: path,
        active: null,
        results: results.slice(),
        done: false
      }));

  emit('INIT', `"${chars}", k=${k}`, `Build every length-${k} string over the characters {${charset.join(', ')}}, reusing characters freely. Extend the path one character at a time; when it reaches length ${k}, record it, then backtrack to try the next character. There are ${charset.length}^${k} = ${charset.length ** k} strings.`, { active: null });

  const backtrack = () => {
    if (path.length === k) {
      results.push(path);
      emit('RECORD', `+${path}`, `Path reached length ${k} — record the string "${path}" (${results.length} so far).`, { active: null }, 'good');
      return;
    }
    for (const ch of charset) {
      path += ch;
      emit('CHOOSE', `append ${ch}`, `Append '${ch}' at position ${path.length} → "${path}". Recurse to fill the rest.`, { active: ch });
      backtrack();
      path = path.slice(0, -1);
      emit('BACKTRACK', `drop ${ch}`, `Backtrack: remove the trailing '${ch}' → "${path}" and try the next character.`, { active: ch });
    }
  };

  backtrack();
  emit('DONE', `${results.length} strings`, `All branches explored — ${results.length} length-${k} strings over {${charset.join(', ')}}.`, { active: null , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<CSSState>) {
  const s = frame.state;
  const slots = Array.from({ length: s.k }, (_, i) => s.path[i] ?? '·');
  const rail = (
    <>
      <RailStack label="results" items={s.results} />
      <RailGroup label="state">
        <RailStat k="path" v={s.path || '∅'} tone="accent" />
        <RailStat k="found" v={s.results.length} />
      </RailGroup>
      {s.done && <RailResult label="total" value={s.results.length} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail}>
      <div className={cn(vizText.sm, 'text-ink3')}>
        charset = <span className="font-mono text-ink">{[...s.chars].join(' ')}</span> · length k = {s.k}
      </div>
      <div className={cn('mt-3', vizText.sm, 'text-ink3')}>partial string</div>
      <div className="mt-1 flex gap-1">
        {slots.map((c, i) => (
          <CharCell
            key={i}
            active={i === s.path.length - 1 && !!s.active}
            className={cn(c === '·' ? 'text-ink3' : '')}
          >
            {c}
          </CharCell>
        ))}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<CSSState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="charset" v={s.chars} />
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="path" v={s.path || '∅'} />
      <InspectorRow k="found" v={s.results.length} />
      <InspectorRow k="target s^k" v={[...s.chars].length ** s.k} />
    </VarGrid>
  );
}

export const manifestId = 'imp-28-combination-of-subset-strings';
export const title = 'Combination of Subset Strings';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ab2', label: '"ab", k=2', value: { chars: 'ab', k: 2 } },
    { id: 'abc2', label: '"abc", k=2', value: { chars: 'abc', k: 2 } },
  ] satisfies SampleInput<CSSInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CSSState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} strings` };
  },
};
