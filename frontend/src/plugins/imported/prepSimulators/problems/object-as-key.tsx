import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface Student {
  ID: number;
  Name: string;
}

interface ObjectAsKeyInput {
  students: Student[];
  // grades is a map keyed by the whole Student struct; we model it as entries.
  grades: [Student, number][];
}

interface ResultEntry {
  student: Student;
  grade: number;
}

interface ObjectAsKeyState {
  students: Student[];
  grades: [Student, number][];
  i: number | null; // index of the student currently being looked up
  probeKey: string | null; // the composite key being looked up this step
  found: number | null; // grade pulled out of the map this step, if any
  result: ResultEntry[]; // students copied into the result so far
  done: boolean;
}

// Compose the same composite identity Go uses for a struct key: every field
// participates, so two students match only when BOTH ID and Name are equal.
function keyOf(s: Student): string {
  return `${s.ID}|${s.Name}`;
}

function gradesToMap(entries: [Student, number][]): Map<string, number> {
  const m = new Map<string, number>();
  for (const [s, g] of entries) m.set(keyOf(s), g);
  return m;
}

function record({ students, grades }: ObjectAsKeyInput): Frame<ObjectAsKeyState>[] {  const gmap = gradesToMap(grades);
  const result: ResultEntry[] = [];

  const { emit, frames } = createRecorder<ObjectAsKeyState>(() => ({
        students,
        grades,
        i: null,
        probeKey: null,
        found: null,
        result: result.map((e) => ({ student: e.student, grade: e.grade })),
        done: false
      }));

  emit(
    'INIT',
    `${students.length} students`,
    `Object as key: the grades map is keyed by the whole Student struct, so a lookup matches only when BOTH ID and Name are equal. We scan the students list and copy each one that exists in the map into the result.`,
    {},
  );

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const k = keyOf(s);
    emit(
      'PROBE',
      `grades[{${s.ID},${s.Name}}]`,
      `Look up student {ID:${s.ID}, Name:"${s.Name}"} in the map. Go hashes every field of the struct, so the key is the pair (${s.ID}, "${s.Name}").`,
      { i, probeKey: k },
    );

    if (gmap.has(k)) {
      const g = gmap.get(k)!;
      result.push({ student: s, grade: g });
      emit(
        'COPY',
        `result[${s.Name}]=${g}`,
        `Hit — the struct key {${s.ID},"${s.Name}"} is present with grade ${g}. Copy it into the result: result[{${s.ID},"${s.Name}"}] = ${g}.`,
        { i, probeKey: k, found: g, result: result.map((e) => ({ student: e.student, grade: e.grade })) },
        'good',
      );
    } else {
      emit(
        'MISS',
        `no entry`,
        `Miss — no map entry has both ID ${s.ID} and Name "${s.Name}", so this student is skipped. (A student with the same Name but a different ID would NOT match.)`,
        { i, probeKey: k },
        'bad',
      );
    }
  }

  emit(
    'DONE',
    `${result.length} kept`,
    `Done. ${result.length} of ${students.length} students were found in the grades map and copied to the result. Each lookup was O(1); the result holds O(n) entries.`,
    { done: true, result: result.map((e) => ({ student: e.student, grade: e.grade })) },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ObjectAsKeyState>) {
  const s = frame.state;
  const labels = s.students.map((st) => `${st.ID}·${st.Name}`);
  const inResult = new Set(s.result.map((e) => keyOf(e.student)));

  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });

  const tone = (i: number) => {
    const st = s.students[i];
    if (!st) return '';
    if (inResult.has(keyOf(st))) return 'found';
    if (s.i === i) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        students (key = {'{'}ID, Name{'}'})
        {s.probeKey !== null && !s.done && (
          <>
            {' · '}probe ={' '}
            <span className="font-mono text-ink">{`{${s.students[s.i ?? 0]?.ID},${s.students[s.i ?? 0]?.Name}}`}</span>
          </>
        )}
      </div>
      <ArrayRow values={labels} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        grades {'{'}
        {s.grades.map(([st, g]) => `${st.ID}·${st.Name}:${g}`).join(', ')}
        {'}'}
      </div>
      <div className={cn('mt-1 font-mono', s.result.length ? 'text-good' : 'text-ink3', vizText.sm)}>
        result {'{'}
        {s.result.map((e) => `${e.student.ID}·${e.student.Name}:${e.grade}`).join(', ')}
        {'}'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ObjectAsKeyState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.i !== null ? s.students[s.i] : null;
  return (
    <VarGrid>
      <InspectorRow k="students" v={s.students.length} />
      <InspectorRow k="grades size" v={s.grades.length} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="key {ID,Name}" v={cur ? `{${cur.ID}, ${cur.Name}}` : '—'} />
      <InspectorRow k="lookup" v={s.found !== null ? `hit ${s.found}` : s.probeKey !== null ? 'miss' : '—'} />
      <InspectorRow k="result size" v={s.result.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-hash-maps-object-as-key';
export const title = 'Object as key';

const sampleA: ObjectAsKeyInput = {
  students: [
    { ID: 1, Name: 'Ana' },
    { ID: 2, Name: 'Ben' },
    { ID: 3, Name: 'Cleo' },
    { ID: 1, Name: 'Ben' }, // same Name as id 2, different ID → must NOT match
  ],
  grades: [
    [{ ID: 1, Name: 'Ana' }, 95],
    [{ ID: 2, Name: 'Ben' }, 80],
    [{ ID: 4, Name: 'Dan' }, 70],
  ],
};

const sampleB: ObjectAsKeyInput = {
  students: [
    { ID: 7, Name: 'Mae' },
    { ID: 8, Name: 'Lia' },
  ],
  grades: [
    [{ ID: 7, Name: 'Mae' }, 88],
    [{ ID: 8, Name: 'Lia' }, 88],
  ],
};






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Object as key\"?",
    choices: [
      {
        label: "Custom hash key / struct map — fits this problem",
        correct: true
      },
      {
        label: "Frequency map — different approach"
      },
      {
        label: "Sliding window + frequency map — different approach"
      },
      {
        label: "Hash map chain reconstruction — different approach"
      }
    ],
    explain: "The whole struct value is the map key; Go compares its fields"
  },
  {
    id: "init",
    prompt: "At the start of a run (Object as key), what strategy is established?",
    choices: [
      {
        label: "The whole struct value — described in INIT caption",
        correct: true
      },
      {
        label: "Precomputed final answer — before scanning input"
      },
      {
        label: "Descending sort required — as mandatory first step"
      },
      {
        label: "Every element visited upfront — marked from the start"
      }
    ],
    explain: "Object as key: the grades map is keyed by the whole Student struct, so a lookup matches only when BOTH ID and Name are equal. We scan the students list and copy each one that exists in the map into the result."
  },
  {
    id: "key-step",
    prompt: "On the \"COPY\" step (result[]=), what happens?",
    choices: [
      {
        label: "Hit — the struct key {,\"\"} — this move caption",
        correct: true
      },
      {
        label: "Run terminates immediately — no further frames"
      },
      {
        label: "Pointers reset to zero — restart scan"
      },
      {
        label: "Remaining input skipped — early return path"
      }
    ],
    explain: "Hit — the struct key {,\"\"} is present with grade . Copy it into the result: result[{,\"\"}] = ."
  },
  {
    id: "state",
    prompt: "What does the `i` field track in the visualization state?",
    choices: [
      {
        label: "index of the student currently — updated each frame",
        correct: true
      },
      {
        label: "Fixed display label — unchanged each frame"
      },
      {
        label: "Shuffle seed value — for random ordering"
      },
      {
        label: "Failure error code — set once at end"
      }
    ],
    explain: "The recorder keeps `i` in sync: index of the student currently being looked up"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Object as key\"?",
    choices: [
      {
        label: "O(1) per op time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(n log n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n·e·α(n)) time, O(n·e) space — wrong order of growth"
      },
      {
        label: "O(2ⁿ) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(1) per op. O(n). map[Student]; copy grades[s] when present"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Done. of students were found — final DONE caption",
        correct: true
      },
      {
        label: "Incomplete partial result — more steps needed"
      },
      {
        label: "Input left unchanged — no mutations applied"
      },
      {
        label: "Aborted run on failure — infinite loop detected"
      }
    ],
    explain: "Done.  of  students were found in the grades map and copied to the result. Each lookup was O(1); the result holds O(n) entries."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'oak1', label: '4 students, 3 graded', value: sampleA },
    { id: 'oak2', label: '2 students, all graded', value: sampleB },
  ] satisfies SampleInput<ObjectAsKeyInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ObjectAsKeyState | undefined;
    const n = s?.result.length ?? 0;
    return { ok: n > 0, label: `${n} matched` };
  },
};
