import type { ComponentType } from 'react';
import { definePlugin, type InspectorProps, type ProblemPlugin } from '../../core/types';
import { wireTeachingStack, codePiecesFromSource } from '../_shared/pluginKit';
import { VarGrid, vizText } from '../_shared/vizKit';
import { cn } from '../../lib/cn';
import { prepCodePieces } from './prepCodePieces';
import { recordScene, SceneView, SceneInspector, sceneVerdict } from './prepScene';
import { resolvePrepSimulator } from './prepSimulators';
import { defaultPrepQuiz } from './prepQuiz';

/**
 * One record in the generated prep manifest (see scripts/import-prep.mjs). These
 * are the 16 "non-big4" topics of the prep study collection — imported with the
 * cinematic `scene`, `visual` (how it runs) and `memorize` line, plus the real Go
 * `solution.go`. Each renders as the animated Scene unless a hand-built simulator
 * exists for its id.
 */
export interface PrepProblem {
  id: string;
  topic: string;
  topicTitle: string;
  course: string;
  courseIcon: string;
  slug: string;
  number: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  pattern: string;
  visual: string;
  memorize: string;
  scene: string;
  acquired: string;
  time: string;
  space: string;
  code: string;
  notes: string;
  approaches: string;
  variants: { file: string; text: string }[];
}

function NotesBlock({ title, body }: { title: string; body: string }) {
  return (
    <details className="mt-2 rounded-md border border-edge bg-panel2/40 px-2 py-1.5">
      <summary className={cn('cursor-pointer text-ink3', vizText.tight)}>{title}</summary>
      <pre className={cn('nodrag mt-1.5 max-h-[200px] overflow-auto whitespace-pre-wrap font-mono leading-relaxed text-ink2', vizText.tight)}>
        {body}
      </pre>
    </details>
  );
}

/** Append the prep NOTES.md / Approaches under a simulator's own inspector. */
function withNotes(
  Inspector: ComponentType<InspectorProps<any>>,
  p: PrepProblem,
): ComponentType<InspectorProps<any>> {
  if (!p.notes && !p.approaches) return Inspector;
  return function InspectorWithNotes(props: InspectorProps<any>) {
    return (
      <>
        <Inspector {...props} />
        <VarGrid>
          {p.notes && <NotesBlock title="Notes (NOTES.md)" body={p.notes} />}
          {p.approaches && <NotesBlock title="Approaches" body={p.approaches} />}
        </VarGrid>
      </>
    );
  };
}

export function makePrepPlugin(p: PrepProblem): ProblemPlugin<any, any> {
  const meta = {
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    tags: p.tags,
    summary: p.pattern || p.visual || `${p.topicTitle} problem.`,
  };
  const code = { text: p.code, lang: 'go', file: 'solution.go' };
  const extraCode = p.variants.map((v) => ({ text: v.text, lang: 'go', file: `variants/${v.file}` }));
  const codePieces = codePiecesFromSource(p.code) ?? prepCodePieces(p.code) ?? undefined;
  const fallbackQuiz = defaultPrepQuiz(p);

  const sim = resolvePrepSimulator(p.id);

  if (sim) {
    const verdict = sim.verdict ?? (() => ({ ok: true, label: p.difficulty.toLowerCase() }));
    const teaching = sim.practice
      ? wireTeachingStack({
          record: sim.record,
          View: sim.View,
          inputs: sim.inputs,
          verdict,
          practice: sim.practice,
        })
      : null;
    return definePlugin<any, any>({
      meta,
      inputs: sim.inputs,
      record: sim.record,
      View: sim.View,
      Inspector: withNotes(sim.Inspector ?? SceneInspector, p),
      verdict,
      code,
      extraCode,
      quiz: sim.practice?.quiz ?? fallbackQuiz,
      codePieces: sim.practice?.codePieces ?? codePieces,
      tabs: teaching?.tabs,
      wires: teaching?.wires,
    });
  }

  return definePlugin<PrepProblem, any>({
    meta,
    inputs: [{ id: 'scene', label: 'Scene', value: p }],
    record: recordScene,
    View: SceneView,
    Inspector: withNotes(SceneInspector, p),
    verdict: sceneVerdict,
    code,
    extraCode,
    quiz: fallbackQuiz,
    codePieces,
  });
}
