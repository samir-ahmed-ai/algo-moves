import type { ComponentType } from 'react';
import { definePlugin, type InspectorProps, type ProblemPlugin } from '../../core/types';
import { wireTeachingStack, codePiecesFromSource } from '../_shared/pluginKit';
import { withInspectorNotes } from '../_shared/withInspectorNotes';
import { prepCodePieces } from './prepCodePieces';
import { recordScene, SceneView, SceneInspector, sceneVerdict } from './prepScene';
import { resolvePrepSimulator } from './prepSimulators';
import { DesignFlow } from './prepSimulators/designDiagrams/DesignFlow';
import { getDesignDiagram } from './prepSimulators/designDiagrams/registry';
import { defaultPrepQuiz } from './prepQuiz';
import { PROBLEM_PORTS } from './languagePorts';
import type { PrepProblem } from './prepTypes';

export type { PrepProblem } from './prepTypes';

/** Append the prep NOTES.md / Approaches under a simulator's own inspector. */
function withNotes(
  Inspector: ComponentType<InspectorProps<any>>,
  p: PrepProblem,
): ComponentType<InspectorProps<any>> {
  return withInspectorNotes(Inspector, [
    ...(p.notes ? [{ title: 'Notes (NOTES.md)', body: p.notes }] : []),
    ...(p.approaches ? [{ title: 'Approaches', body: p.approaches }] : []),
  ]);
}

export function makePrepPlugin(p: PrepProblem): ProblemPlugin<any, any> {
  const meta = {
    id: p.id,
    title: p.title,
    number: p.number,
    difficulty: p.difficulty,
    tags: p.tags,
    summary: p.pattern || p.visual || `${p.topicTitle} problem.`,
  };
  const code = { text: p.code, lang: 'go', file: 'solution.go' };
  const extraCode = p.variants.map((v) => ({
    text: v.text,
    lang: 'go',
    file: `variants/${v.file}`,
  }));
  const ports = PROBLEM_PORTS[p.id];
  if (ports?.python) extraCode.push({ text: ports.python, lang: 'python', file: 'solution.py' });
  if (ports?.java) extraCode.push({ text: ports.java, lang: 'java', file: 'Solution.java' });
  const codePieces = codePiecesFromSource(p.code) ?? prepCodePieces(p.code) ?? undefined;
  const fallbackQuiz = defaultPrepQuiz(p);

  const sim = resolvePrepSimulator(p.id);
  const designSpec = p.topic === 'design' ? getDesignDiagram(p.id) : undefined;

  // Design-topic problems show static architecture diagrams, not step animations.
  if (designSpec) {
    return definePlugin<any, any>({
      meta: { ...meta, static: true },
      inputs: [{ id: 'design', label: 'Design', value: null }],
      record: () => [
        {
          move: { type: 'DESIGN', note: p.title, caption: designSpec.pages[0]?.caption ?? '' },
          state: {},
        },
      ],
      View: () => <DesignFlow spec={designSpec} />,
      Inspector: withNotes(SceneInspector, p),
      verdict: () => ({ ok: true, label: p.difficulty.toLowerCase() }),
      code,
      extraCode,
      quiz: sim?.practice?.quiz ?? fallbackQuiz,
      codePieces: sim?.practice?.codePieces ?? codePieces,
    });
  }

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
