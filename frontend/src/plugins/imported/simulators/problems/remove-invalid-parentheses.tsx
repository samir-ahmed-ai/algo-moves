import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ParenInput {
  s: string;
}

interface Candidate {
  str: string;
  valid: boolean;
}

interface ParenState {
  input: string;
  removals: number; // how many chars removed at this BFS level
  level: Candidate[]; // candidate strings at the current level
  results: string[]; // valid answers (fewest removals), once found
  done: boolean;
}

function isValid(s: string): boolean {
  let cnt = 0;
  for (const ch of s) {
    if (ch === '(') cnt++;
    else if (ch === ')') cnt--;
    if (cnt < 0) return false;
  }
  return cnt === 0;
}

function record({ s }: ParenInput): Frame<ParenState>[] {
  const { emit, frames } = createRecorder<ParenState>(() => ({
        input: s,
        removals: 0,
        level: [],
        results: [],
        done: false
      }));

  emit('INIT', `"${s}"`, `Remove Invalid Parentheses: delete the fewest characters so the string is balanced. BFS by removal-count: level 0 is the original string. If any string on a level is valid, those are the answers; otherwise drop one more char from each and search the next level.`, { removals: 0, level: [], results: [] });

  const vis = new Set<string>([s]);
  let queue: string[] = [s];
  let removals = 0;
  let answers: string[] = [];

  while (queue.length > 0) {
    // Build this level's candidate list with validity flags for the View.
    const level: Candidate[] = queue.map((str) => ({ str, valid: isValid(str) }));
    const valid = level.filter((c) => c.valid).map((c) => c.str);

    emit('LEVEL', `level ${removals} · ${level.length} candidate${level.length === 1 ? '' : 's'}`, `Level ${removals} (${removals} char${removals === 1 ? '' : 's'} removed): ${level.length} candidate string${level.length === 1 ? '' : 's'}. Check each for balance.`, { removals: removals, level: level, results: [] });

    if (valid.length > 0) {
      answers = valid;
      emit('FOUND', `${valid.length} valid at level ${removals}`, `Found ${valid.length} balanced string${valid.length === 1 ? '' : 's'} at level ${removals}. This is the minimum number of removals, so these are the answers — stop here.`, { removals: removals, level: level, results: answers });
      break;
    }

    // No valid string yet — expand: remove one paren from each candidate.
    const next: string[] = [];
    for (const cur of queue) {
      for (let j = 0; j < cur.length; j++) {
        const ch = cur[j];
        if (ch !== '(' && ch !== ')') continue;
        const cand = cur.slice(0, j) + cur.slice(j + 1);
        if (!vis.has(cand)) {
          vis.add(cand);
          next.push(cand);
        }
      }
    }
    emit('EXPAND', `→ level ${removals + 1}`, `Nothing balanced at level ${removals}. Remove one more parenthesis from each candidate, giving ${next.length} new string${next.length === 1 ? '' : 's'} for level ${removals + 1}.`, { removals: removals, level: level, results: [] });
    queue = next;
    removals++;
  }

  emit('DONE', answers.length ? `[${answers.map((a) => `"${a}"`).join(', ')}]` : 'no result', answers.length
      ? `Answer (fewest removals = ${removals}): ${answers.map((a) => `"${a}"`).join(', ')}.`
      : `No balanced string was found.`, { removals: removals, level: [], results: answers , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<ParenState>) {
  const s = frame.state;
  const ansLine = s.results.length ? s.results.map((r) => `"${r}"`).join(', ') : s.done ? '—' : '…searching';
  return (
    <div className="board-area board-area--text">
      <div className={cn(vizText.sm, 'text-ink3')}>
        input <span className="font-mono text-ink">"{s.input}"</span> · removal level{' '}
        <span className="font-mono text-ink">{s.removals}</span>
      </div>
      <div
        className="flex flex-wrap gap-2 rounded-md border border-[var(--line)] p-3"
        style={{ minHeight: 56 }}
      >
        {s.level.length === 0 ? (
          <span className={cn(vizText.sm, 'text-ink3')}>{s.done ? 'search complete' : '(no candidates)'}</span>
        ) : (
          s.level.map((c, i) => (
            <span
              key={`${c.str}-${i}`}
              className={cn('rounded px-2 py-1 font-mono', vizText.base)}
              style={{
                background: c.valid ? 'var(--good-bg)' : 'var(--surface-2)',
                color: c.valid ? 'var(--good)' : 'var(--text)',
                border: c.valid ? '1px solid var(--good)' : '1px solid transparent',
              }}
            >
              {c.str === '' ? 'ε' : c.str}
            </span>
          ))
        )}
      </div>
      <div className={cn(vizText.sm, 'text-ink3')}>
        valid answers = <span className="font-mono text-ink">{ansLine}</span>
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ParenState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="removal level" v={s.removals} />
      <InspectorRow k="candidates" v={s.level.length} />
      <InspectorRow k="valid this level" v={s.level.filter((c) => c.valid).length} />
      <InspectorRow k="answers" v={s.results.length ? s.results.map((r) => `"${r}"`).join(', ') : '—'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-3-remove-invalid-parentheses';
export const title = 'Remove Invalid Parentheses';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'p1', label: '"()())()" → 1 removal', value: { s: '()())()' } },
    { id: 'p2', label: '"(a)())()" → 1 removal', value: { s: '(a)())()' } },
  ] satisfies SampleInput<ParenInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ParenState | undefined;
    const r = s?.results ?? [];
    return r.length ? { ok: true, label: `[${r.map((a) => `"${a}"`).join(', ')}]` } : { ok: false, label: 'no result' };
  },
};
