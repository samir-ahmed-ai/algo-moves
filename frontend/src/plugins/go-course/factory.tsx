import type { ComponentType } from 'react';
import { definePlugin, type InspectorProps, type ProblemPlugin } from '../../core/types';
import { codePiecesFromSource } from '../_shared/pluginKit';
import { VarGrid, CollapsibleDetails } from '../_shared/vizKit';
import { recordScene, SceneView, SceneInspector, sceneVerdict } from '../imported/prepScene';
import type { PrepProblem } from '../imported/prepFactory';
import { recordTrace, TraceView, traceVerdict, makeGoInspector } from './anim/codeTrace';
import type { GoConcept, GoTopic } from './types';

const COURSE_TITLE = 'Go · Senior Developer';

/**
 * Adapt a GoConcept to the PrepProblem shape the Scene player consumes, folding
 * the senior takeaways into `notes` and the design Q&A into `approaches` so both
 * surface as collapsible blocks in the inspector.
 */
function toPrepProblem(c: GoConcept, topic: GoTopic): PrepProblem {
  const notes = c.keyPoints.length ? `- ${c.keyPoints.join('\n- ')}` : '';
  const approaches = `${c.design.prompt}\n\nModel answer\n${c.design.answer}`;
  return {
    id: c.id,
    topic: topic.id,
    topicTitle: topic.title,
    course: COURSE_TITLE,
    courseIcon: topic.icon,
    slug: c.id,
    number: '',
    title: c.title,
    difficulty: c.difficulty,
    tags: c.tags,
    pattern: c.pattern,
    visual: c.visual,
    memorize: c.memorize,
    scene: c.scene,
    acquired: c.summary,
    time: c.time,
    space: c.space,
    code: c.code,
    notes,
    approaches,
    variants: [],
  };
}

/** Append the senior takeaways and design Q&A under the Scene inspector. */
function withGoNotes(
  Inspector: ComponentType<InspectorProps<any>>,
  p: PrepProblem,
): ComponentType<InspectorProps<any>> {
  if (!p.notes && !p.approaches) return Inspector;
  return function InspectorWithGoNotes(props: InspectorProps<any>) {
    return (
      <>
        <Inspector {...props} />
        <VarGrid>
          {p.notes && <CollapsibleDetails title="Senior takeaways" body={p.notes} maxHeightClass="max-h-[240px]" />}
          {p.approaches && (
            <CollapsibleDetails title="Design question & model answer" body={p.approaches} maxHeightClass="max-h-[240px]" />
          )}
        </VarGrid>
      </>
    );
  };
}

/**
 * Turn a hand-authored Go concept into a generic ProblemPlugin: the Scene player
 * animates the mnemonic (Scene → How it runs → Memorize → Complexity), the Go
 * sample drives the Code Studio / reassembly, and the concept quiz powers the
 * Quiz phase and Learn-mode Quiz tab.
 */
export function makeGoConceptPlugin(c: GoConcept, topic: GoTopic): ProblemPlugin<any, any> {
  const meta = {
    id: c.id,
    title: c.title,
    difficulty: c.difficulty,
    tags: c.tags,
    summary: c.summary,
  };
  const code = { text: c.code, lang: 'go', file: 'main.go' };
  const codePieces = codePiecesFromSource(c.code);

  // Concepts with an authored walkthrough get the animated code-trace player
  // (active lines glow + auto-scroll, evolving state rail); the rest fall back
  // to the Scene mnemonic reveal.
  if (c.walkthrough && c.walkthrough.length > 0) {
    return definePlugin<GoConcept, any>({
      meta,
      inputs: [{ id: 'trace', label: 'Trace', value: c }],
      record: recordTrace,
      View: TraceView,
      Inspector: makeGoInspector(c),
      verdict: traceVerdict,
      code,
      quiz: c.quiz,
      codePieces,
    });
  }

  const p = toPrepProblem(c, topic);
  return definePlugin<PrepProblem, any>({
    meta,
    inputs: [{ id: 'concept', label: 'Concept', value: p }],
    record: recordScene,
    View: SceneView,
    Inspector: withGoNotes(SceneInspector, p),
    verdict: sceneVerdict,
    code,
    quiz: c.quiz,
    codePieces,
  });
}
