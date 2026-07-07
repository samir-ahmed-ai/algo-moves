import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  RailStack,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface IsIsomorphicInput {
  s: string;
  t: string;
}

interface IsIsomorphicState {
  s: string[]; // characters of s
  t: string[]; // characters of t
  i: number | null; // current index being compared
  a: string | null; // s[i]
  b: string | null; // t[i]
  m1: [string, string][]; // s -> t mapping entries so far
  m2: [string, string][]; // t -> s mapping entries so far
  conflict: boolean; // the current step contradicted an existing mapping
  result: boolean | null; // final computed answer
  done: boolean;
}

function record({ s, t }: IsIsomorphicInput): Frame<IsIsomorphicState>[] {
  const sc = [...s];
  const tc = [...t];
  const m1 = new Map<string, string>();
  const m2 = new Map<string, string>();

  const { emit, frames } = createRecorder<IsIsomorphicState>(() => ({
    s: sc,
    t: tc,
    i: null,
    a: null,
    b: null,
    m1: [...m1.entries()],
    m2: [...m2.entries()],
    conflict: false,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `"${s}" vs "${t}"`,
    `Is Isomorphic: two strings are isomorphic when characters in s can be replaced to get t with a consistent one-to-one mapping. Walk both strings in lockstep, enforcing s[i]→t[i] and t[i]→s[i] at every position.`,
    {},
  );

  if (sc.length !== tc.length) {
    emit(
      'LENGTH',
      'length mismatch',
      `The strings have different lengths (${sc.length} vs ${tc.length}), so no one-to-one character mapping can line them up. Not isomorphic.`,
      { result: false, done: true },
      'bad',
    );
    return frames;
  }

  for (let i = 0; i < sc.length; i++) {
    const a = sc[i];
    const b = tc[i];
    emit(
      'SCAN',
      `${a} ? ${b}`,
      `At index ${i} we pair s[${i}]='${a}' with t[${i}]='${b}'. Check both mapping tables: does '${a}' already map to something other than '${b}', or '${b}' to something other than '${a}'?`,
      { i, a, b },
    );

    const v1 = m1.get(a);
    if (v1 !== undefined && v1 !== b) {
      emit(
        'CONFLICT',
        `${a}→${v1} ≠ ${b}`,
        `Conflict: '${a}' is already mapped to '${v1}', but here it would need to map to '${b}'. A character cannot map to two different characters. Not isomorphic.`,
        { i, a, b, conflict: true, result: false, done: true },
        'bad',
      );
      return frames;
    }

    const v2 = m2.get(b);
    if (v2 !== undefined && v2 !== a) {
      emit(
        'CONFLICT',
        `${b}←${v2} ≠ ${a}`,
        `Conflict: '${b}' is already mapped back from '${v2}', but here '${a}' also maps to '${b}'. Two different characters cannot map onto the same one. Not isomorphic.`,
        { i, a, b, conflict: true, result: false, done: true },
        'bad',
      );
      return frames;
    }

    m1.set(a, b);
    m2.set(b, a);
    emit(
      'MAP',
      `${a}↔${b}`,
      `Consistent — record '${a}'→'${b}' in the s→t table and '${b}'→'${a}' in the t→s table. Continue to the next index.`,
      { i, a, b },
      'good',
    );
  }

  emit(
    'DONE',
    'isomorphic',
    `Every position mapped consistently with no contradictions, so the two strings are isomorphic.`,
    { result: true, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<IsIsomorphicState>) {
  const st = frame.state;

  const sPointers: ArrayPointer[] = [];
  const tPointers: ArrayPointer[] = [];
  if (st.i !== null) {
    const tone: ArrayPointer['tone'] = st.conflict ? 'bad' : st.done ? 'good' : 'accent';
    sPointers.push({ i: st.i, label: 'i', tone, place: 'above' });
    tPointers.push({ i: st.i, label: 'i', tone, place: 'above' });
  }

  const cellTone = (i: number) => {
    if (st.i === null) return '';
    if (i === st.i) return st.conflict ? 'bad' : 'match';
    return i < st.i ? 'found' : '';
  };

  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="i" v={st.i ?? '—'} tone="accent" />
        <RailStat k="s[i]" v={st.a ?? '—'} />
        <RailStat k="t[i]" v={st.b ?? '—'} />
      </RailGroup>
      <RailStack label="s→t" items={st.m1.map(([k, v]) => `${k}:${v}`)} />
      <RailStack label="t→s" items={st.m2.map(([k, v]) => `${k}:${v}`)} />
      {st.result !== null && (
        <RailResult
          label="answer"
          value={st.result ? 'isomorphic' : 'not isomorphic'}
          tone={st.result ? 'good' : 'bad'}
        />
      )}
    </>
  );

  return (
    <VizStage rail={rail}>
      <ArrayRow values={st.s} cellTone={cellTone} pointers={sPointers} windowRange={null} />
      <ArrayRow values={st.t} cellTone={cellTone} pointers={tPointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<IsIsomorphicState>) {
  if (!frame) return <VizEmpty />;
  const st = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={st.i ?? '—'} />
      <InspectorRow k="s[i]" v={st.a ?? '—'} />
      <InspectorRow k="t[i]" v={st.b ?? '—'} />
      <InspectorRow k="s→t size" v={st.m1.length} />
      <InspectorRow k="t→s size" v={st.m2.length} />
      <InspectorRow
        k="result"
        v={
          st.result === null
            ? st.done
              ? 'none'
              : '…'
            : st.result
              ? 'isomorphic'
              : 'not isomorphic'
        }
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-is-isomorphic';
export const title = 'Is isomorphic';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Is isomorphic"?',
    choices: [
      {
        label: 'Bijection map — fits this problem',
        correct: true,
      },
      {
        label: 'Frequency map — different approach',
      },
      {
        label: 'Sort + Wrap-around — different approach',
      },
      {
        label: 'Adjacent swap — different approach',
      },
    ],
    explain: 'Two-way letter mapping s<->t must never contradict',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Is isomorphic), what strategy is established?',
    choices: [
      {
        label: 'Two-way letter mapping s<->t must never — described in INIT caption',
        correct: true,
      },
      {
        label: 'Precomputed final answer — before scanning input',
      },
      {
        label: 'Descending sort required — as mandatory first step',
      },
      {
        label: 'Every element visited upfront — marked from the start',
      },
    ],
    explain:
      'Is Isomorphic: two strings are isomorphic when characters in s can be replaced to get t with a consistent one-to-one mapping. Walk both strings in lockstep, enforcing s[i]→t[i] and t[i]→s[i] at every position.',
  },
  {
    id: 'key-step',
    prompt: 'On the "CONFLICT" step (← ≠ ), what happens?',
    choices: [
      {
        label: "Conflict: '' is already mapped back — this move caption",
        correct: true,
      },
      {
        label: 'Run terminates immediately — no further frames',
      },
      {
        label: 'Pointers reset to zero — restart scan',
      },
      {
        label: 'Remaining input skipped — early return path',
      },
    ],
    explain:
      "Conflict: '' is already mapped back from '', but here '' also maps to ''. Two different characters cannot map onto the same one. Not isomorphic.",
  },
  {
    id: 'state',
    prompt: 'What does the `s` field track in the visualization state?',
    choices: [
      {
        label: 'characters of s — updated each frame',
        correct: true,
      },
      {
        label: 'Fixed display label — unchanged each frame',
      },
      {
        label: 'Shuffle seed value — for random ordering',
      },
      {
        label: 'Failure error code — set once at end',
      },
    ],
    explain: 'The recorder keeps `s` in sync: characters of s',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Is isomorphic"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n^2) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n·L) time, O(n·L) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). m1[a]==b and m2[b]==a else conflict',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: "Consistent — record ''→'' — final DONE caption",
        correct: true,
      },
      {
        label: 'Incomplete partial result — more steps needed',
      },
      {
        label: 'Input left unchanged — no mutations applied',
      },
      {
        label: 'Aborted run on failure — infinite loop detected',
      },
    ],
    explain:
      "Consistent — record ''→'' in the s→t table and ''→'' in the t→s table. Continue to the next index.",
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'iso1', label: '"egg" vs "add"', value: { s: 'egg', t: 'add' } },
    { id: 'iso2', label: '"foo" vs "bar"', value: { s: 'foo', t: 'bar' } },
  ] satisfies SampleInput<IsIsomorphicInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const st = frames[frames.length - 1]?.state as IsIsomorphicState | undefined;
    return st?.result ? { ok: true, label: 'isomorphic' } : { ok: false, label: 'not isomorphic' };
  },
};
