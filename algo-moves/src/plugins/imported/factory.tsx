import type { ReactNode, ComponentType } from 'react';
import { definePlugin, type Frame, type InspectorProps, type ProblemPlugin, type PluginViewProps } from '../../core/types';
import { wireTeachingStack, codePiecesFromSource, type PracticeBundle } from '../_shared/pluginKit';
import { resolveSimulator } from './simulators';
import { resolvePracticeBundle } from './practice';
import { cn } from '../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../_shared/vizKit';

/** Imported categories that have hand-authored step-by-step simulators. */
export const SIMULATED_CATEGORIES = new Set(['dynamic-programming', 'graph', 'backtracking', 'binary-search']);

/** Shape of one record in the generated manifest (see scripts/import-problems.mjs). */
export interface ImportedProblem {
  id: string;
  number: string;
  category: string;
  categoryTitle: string;
  course: string;
  courseIcon: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  leetcode: string;
  pattern: string;
  visual: string;
  time: string;
  space: string;
  code: string;
  notes: string;
  approaches: string;
  variants: { file: string; text: string }[];
}

interface ConceptState {
  p: ImportedProblem;
  step: number;
  label: string;
}

const STEP_LABELS = ['Pattern', 'Walkthrough', 'Complexity'] as const;

/** Generic explainer frames so imported problems slot into every canvas mode. */
function recordConcept(p: ImportedProblem): Frame<ConceptState>[] {
  const frames: Frame<ConceptState>[] = [];
  const push = (type: string, note: string, caption: string, step: number) =>
    frames.push({ move: { type, note, caption }, state: { p, step, label: STEP_LABELS[step] ?? '' } });

  push('PATTERN', p.pattern || 'approach', p.pattern || `Solve “${p.title}” with the technique below.`, 0);
  if (p.visual) push('WALKTHROUGH', 'visual', p.visual, 1);
  push(
    'COMPLEXITY',
    'cost',
    `Runs in ${p.time || '—'} time and ${p.space || '—'} space.`,
    2,
  );
  return frames;
}

function Badge({ children, tone }: { children: ReactNode; tone?: 'time' | 'space' | 'diff' }) {
  const bg = tone === 'time' ? 'var(--accent-bg)' : tone === 'space' ? 'var(--good-bg)' : 'var(--surface-2)';
  const fg = tone === 'time' ? 'var(--accent)' : tone === 'space' ? 'var(--good)' : 'var(--text-2)';
  return (
    <span className={cn('rounded-md px-2 py-0.5 font-mono', vizText.sm)} style={{ background: bg, color: fg }}>
      {children}
    </span>
  );
}

function ProblemDetailsBlock({ title, body }: { title: string; body: string }) {
  return (
    <details className="mt-2 rounded-md border border-edge bg-panel2/40 px-2 py-1.5">
      <summary className={cn('cursor-pointer', vizText.xs, 'text-ink3')}>{title}</summary>
      <pre className={cn('nodrag mt-1.5 max-h-[200px] overflow-auto whitespace-pre-wrap font-mono leading-relaxed text-ink2', vizText.xs)}>
        {body}
      </pre>
    </details>
  );
}

function ProblemDetails({ notes, approaches }: { notes?: string; approaches?: string }) {
  if (!notes && !approaches) return null;
  return (
    <>
      {notes && <ProblemDetailsBlock title="Notes (NOTES.md)" body={notes} />}
      {approaches && <ProblemDetailsBlock title="Approaches" body={approaches} />}
    </>
  );
}

function ConceptView({ frame }: PluginViewProps<ConceptState>) {
  const { p, step } = frame.state;
  const Card = ({ active, label, children }: { active: boolean; label: string; children: ReactNode }) => (
    <div
      className="rounded-[var(--radius)] border p-4 transition-colors"
      style={{
        borderColor: active ? 'var(--accent)' : 'var(--border)',
        background: active ? 'var(--accent-bg)' : 'transparent',
      }}
    >
      <div className={cn('mb-1.5 font-medium uppercase tracking-wide', vizText.xs)} style={{ color: active ? 'var(--accent)' : 'var(--text-3)' }}>
        {label}
      </div>
      <div className={cn('leading-relaxed text-ink2', vizText.base)}>{children}</div>
    </div>
  );
  return (
    <div className="board-area flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="diff">#{p.number}</Badge>
        <Badge tone="time">{p.time || 'Time —'}</Badge>
        <Badge tone="space">{p.space || 'Space —'}</Badge>
      </div>
      <Card active={step === 0} label="Pattern">
        {p.pattern || '—'}
      </Card>
      {p.visual && (
        <Card active={step === 1} label="How it runs">
          {p.visual}
        </Card>
      )}
      <Card active={step === 2} label="Complexity">
        <span className="font-mono">{p.time || '—'}</span> time · <span className="font-mono">{p.space || '—'}</span> space
      </Card>
      {p.leetcode && (
        <a href={p.leetcode} target="_blank" rel="noreferrer" className={cn('nodrag mt-auto inline-flex items-center gap-1 self-start text-accent hover:underline', vizText.base)}>
          Open on LeetCode ↗
        </a>
      )}
    </div>
  );
}

function ConceptInspector({ frame }: InspectorProps<ConceptState>) {
  if (!frame) return <VizEmpty />;
  const { p } = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="problem" v={`#${p.number}`} />
      <InspectorRow k="difficulty" v={p.difficulty} />
      <InspectorRow k="time" v={p.time || '—'} />
      <InspectorRow k="space" v={p.space || '—'} />
      <InspectorRow k="category" v={p.categoryTitle} />
      <ProblemDetails notes={p.notes} approaches={p.approaches} />
    </VarGrid>
  );
}

function mergePractice(simPractice: PracticeBundle | undefined, bundle: PracticeBundle | undefined): PracticeBundle | undefined {
  if (!simPractice && !bundle) return undefined;
  return {
    quiz: bundle?.quiz ?? simPractice?.quiz,
    codePieces: bundle?.codePieces ?? simPractice?.codePieces,
    cases: bundle?.cases ?? simPractice?.cases,
    simulateQuestion: bundle?.simulateQuestion ?? simPractice?.simulateQuestion,
  };
}

function ManifestNotesPanel({ p }: { p: ImportedProblem }) {
  return <ProblemDetails notes={p.notes} approaches={p.approaches} />;
}

function wrapSimulatorInspector(
  Inspector: ComponentType<InspectorProps<any>>,
  p: ImportedProblem,
): ComponentType<InspectorProps<any>> {
  return function SimulatorInspectorWithNotes(props: InspectorProps<any>) {
    const hasNotes = Boolean(p.notes || p.approaches);
    if (!hasNotes) return <Inspector {...props} />;
    return (
      <>
        <Inspector {...props} />
        <VarGrid>
          <ManifestNotesPanel p={p} />
        </VarGrid>
      </>
    );
  };
}

export function makeImportedPlugin(p: ImportedProblem): ProblemPlugin<any, any> {
  const meta = {
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    tags: p.tags,
    source: p.leetcode || undefined,
    summary: p.pattern || p.visual || `${p.categoryTitle} problem.`,
  };
  const code = { text: p.code, lang: 'go', file: 'solution.go' };
  const extraCode = p.variants.map((v) => ({ text: v.text, lang: 'go', file: `variants/${v.file}` }));

  const sim = SIMULATED_CATEGORIES.has(p.category) ? resolveSimulator(p.id, p.title, p.category) : undefined;
  const basePractice = resolvePracticeBundle(p.id, p.code);
  const practice = mergePractice(sim?.practice, basePractice);

  const codePieces = practice?.codePieces ?? codePiecesFromSource(p.code);
  const quiz = practice?.quiz;

  if (sim) {
    const teaching =
      practice?.cases?.good.length || quiz?.length
        ? wireTeachingStack({
            record: sim.record,
            View: sim.View,
            inputs: sim.inputs,
            verdict: sim.verdict ?? (() => ({ ok: true, label: p.difficulty.toLowerCase() })),
            simulateSide: p.category === 'graph',
            practice: practice ?? {},
          })
        : null;

    return definePlugin<any, any>({
      meta,
      inputs: sim.inputs,
      record: sim.record,
      View: sim.View,
      Inspector: sim.Inspector ? wrapSimulatorInspector(sim.Inspector, p) : ConceptInspector,
      verdict: sim.verdict ?? (() => ({ ok: true, label: p.difficulty.toLowerCase() })),
      code,
      extraCode,
      quiz,
      codePieces,
      tabs: teaching?.tabs,
      wires: teaching?.wires,
    });
  }

  const conceptTeaching =
    quiz?.length
      ? wireTeachingStack({
          record: recordConcept,
          View: ConceptView,
          inputs: [{ id: 'concept', label: 'Concept', value: p }],
          practice: (practice ?? { quiz }) as PracticeBundle<ImportedProblem>,
        })
      : null;

  return definePlugin<ImportedProblem, ConceptState>({
    meta,
    inputs: [{ id: 'concept', label: 'Concept', value: p }],
    record: recordConcept,
    View: ConceptView,
    Inspector: ConceptInspector,
    verdict: () => ({ ok: true, label: p.difficulty.toLowerCase() }),
    code,
    extraCode,
    quiz,
    codePieces,
    tabs: conceptTeaching?.tabs,
    wires: conceptTeaching?.wires,
  });
}
