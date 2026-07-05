import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface Contact {
  id: number;
  emails: string[];
}

interface ContactsInput {
  contacts: Contact[];
}

interface ContactsState {
  ids: number[]; // contact ids in input order (the ArrayRow cells)
  parent: [number, number][]; // union-find parent map as id->parent entries
  emailOwner: [string, number][]; // email -> first contact id that claimed it
  i: number | null; // index (in ids) of the contact being processed
  owner: number | null; // existing owner id we union with (its index)
  email: string | null; // email currently inspected
  roots: number[]; // distinct group roots emitted so far (final answer ids)
  done: boolean;
}

function record({ contacts }: ContactsInput): Frame<ContactsState>[] {  const ids = contacts.map((c) => c.id);
  const idxOf = (id: number) => ids.indexOf(id);

  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let r = x;
    while (parent.get(r) !== r) {
      const gp = parent.get(parent.get(r)!)!;
      parent.set(r, gp);
      r = parent.get(r)!;
    }
    return r;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };

  const emailOwner = new Map<string, number>();
  const byId = new Map<number, Contact>();

  const { emit, frames } = createRecorder<ContactsState>(() => ({
        ids,
        parent: [...parent.entries()],
        emailOwner: [...emailOwner.entries()],
        i: null,
        owner: null,
        email: null,
        roots: [],
        done: false
      }));

  emit(
    'INIT',
    `${contacts.length} contacts`,
    `Remove duplicate contacts: two contacts are the same person if they share any email. We use union-find — each contact starts as its own group, and any shared email unions two groups into one.`,
    {},
  );

  // Pass 1: build the union-find structure by scanning every email.
  for (let ci = 0; ci < contacts.length; ci++) {
    const c = contacts[ci];
    parent.set(c.id, c.id);
    byId.set(c.id, c);
    emit(
      'CLAIM_CONTACT',
      `id ${c.id}`,
      `Register contact #${c.id} as the root of its own group: parent[${c.id}] = ${c.id}. Now scan its ${c.emails.length} email(s).`,
      { i: ci },
    );

    for (const e of c.emails) {
      const existing = emailOwner.get(e);
      if (existing !== undefined) {
        emit(
          'UNION',
          `${e} → id ${existing}`,
          `Email "${e}" is already owned by contact #${existing}, so #${c.id} and #${existing} are the same person. Union the two groups.`,
          { i: ci, owner: idxOf(existing), email: e },
          'good',
        );
        union(c.id, existing);
      } else {
        emailOwner.set(e, c.id);
        emit(
          'OWN_EMAIL',
          `${e} → id ${c.id}`,
          `Email "${e}" is new, so contact #${c.id} claims it: emailOwner["${e}"] = ${c.id}.`,
          { i: ci, email: e },
        );
      }
    }
  }

  // Pass 2: emit one contact per distinct root.
  const seen = new Set<number>();
  const roots: number[] = [];
  for (let ci = 0; ci < contacts.length; ci++) {
    const c = contacts[ci];
    const root = find(c.id);
    if (seen.has(root)) {
      emit(
        'SKIP',
        `id ${c.id} dup`,
        `Contact #${c.id} resolves to root #${root}, which we already kept — skip it as a duplicate.`,
        { i: ci, owner: idxOf(root) },
        'bad',
      );
      continue;
    }
    seen.add(root);
    roots.push(root);
    emit(
      'KEEP',
      `keep id ${root}`,
      `Contact #${c.id} resolves to root #${root}, seen for the first time — keep one contact (#${root}) for this group.`,
      { i: ci, owner: idxOf(root), roots: [...roots] },
      'good',
    );
  }

  emit(
    'DONE',
    `${roots.length} unique`,
    `Done. ${contacts.length} input contacts collapse to ${roots.length} unique ${roots.length === 1 ? 'person' : 'people'}: ${roots.map((r) => `#${r}`).join(', ')}.`,
    { roots: [...roots], done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ContactsState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.owner !== null && s.owner >= 0) pointers.push({ i: s.owner, label: 'root', tone: 'good', place: 'below' });
  const rootSet = new Set(s.roots);
  const tone = (i: number) => {
    const id = s.ids[i];
    if (rootSet.has(id)) return 'found';
    if (s.i === i) return 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        contacts ={' '}
        <span className="font-mono text-ink">{s.ids.length}</span>
        {s.email !== null && (
          <>
            {' · '}email ={' '}
            <span className="font-mono text-ink">{s.email}</span>
          </>
        )}
      </div>
      <ArrayRow values={s.ids} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        parent {'{'}
        {s.parent.map(([id, p]) => `${id}:${p}`).join(', ')}
        {'}'}
      </div>
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        emailOwner {'{'}
        {s.emailOwner.map(([e, id]) => `${e}:${id}`).join(', ')}
        {'}'}
      </div>
      {s.roots.length > 0 && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → kept: {s.roots.map((r) => `#${r}`).join(', ')}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ContactsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="total contacts" v={s.ids.length} />
      <InspectorRow k="current id" v={s.i !== null ? s.ids[s.i] : '—'} />
      <InspectorRow k="email" v={s.email ?? '—'} />
      <InspectorRow k="emails seen" v={s.emailOwner.length} />
      <InspectorRow k="groups so far" v={new Set(s.parent.map(([, p]) => p)).size || '—'} />
      <InspectorRow k="kept (unique)" v={s.roots.length > 0 || s.done ? s.roots.length : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-hash-maps-remove-duplicate-contacts';
export const title = 'Remove duplicate contacts';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Remove duplicate contacts\"?",
    choices: [
      {
        label: "Union-find via email index — fits this problem",
        correct: true
      },
      {
        label: "Sliding window + frequency map — different approach"
      },
      {
        label: "Hash map chain reconstruction — different approach"
      },
      {
        label: "Quickselect / partition — different approach"
      }
    ],
    explain: "Any shared email unions two contacts into one group"
  },
  {
    id: "init",
    prompt: "At the start of a run (Remove duplicate contacts), what strategy is established?",
    choices: [
      {
        label: "Any shared email unions two contacts — described in INIT caption",
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
    explain: "Remove duplicate contacts: two contacts are the same person if they share any email. We use union-find — each contact starts as its own group, and any shared email unions two groups into one."
  },
  {
    id: "key-step",
    prompt: "On the \"OWN_EMAIL\" step ( → id ), what happens?",
    choices: [
      {
        label: "Email \"\" is new, so contact — this move caption",
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
    explain: "Email \"\" is new, so contact # claims it: emailOwner[\"\"] = ."
  },
  {
    id: "state",
    prompt: "What does the `ids` field track in the visualization state?",
    choices: [
      {
        label: "contact ids in input order — updated each frame",
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
    explain: "The recorder keeps `ids` in sync: contact ids in input order (the ArrayRow cells)"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Remove duplicate contacts\"?",
    choices: [
      {
        label: "O(n·e·α(n)) time, O(n·e) space — standard bounds here",
        correct: true
      },
      {
        label: "O(2ⁿ) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(log n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n·e·α(n)). O(n·e). emailOwner seen -> union; else claim; emit one per root"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Done. input contacts collapse to unique — final DONE caption",
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
    explain: "Done.  input contacts collapse to  unique : ${roots.map((r) => "
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'rdc1',
      label: '4 contacts, 2 people',
      value: {
        contacts: [
          { id: 1, emails: ['a@x', 'b@x'] },
          { id: 2, emails: ['b@x'] },
          { id: 3, emails: ['c@x'] },
          { id: 4, emails: ['c@x', 'd@x'] },
        ],
      },
    },
    {
      id: 'rdc2',
      label: '3 contacts, all distinct',
      value: {
        contacts: [
          { id: 1, emails: ['p@x'] },
          { id: 2, emails: ['q@x'] },
          { id: 3, emails: ['r@x'] },
        ],
      },
    },
  ] satisfies SampleInput<ContactsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ContactsState | undefined;
    const n = s?.roots.length ?? 0;
    return { ok: true, label: `${n} unique` };
  },
};
