import type { ComponentType } from 'react';
import { definePlugin, type InspectorProps, type ProblemPlugin } from '../../core/types';
import { codePiecesFromSource } from '../_shared/pluginKit';
import { VarGrid, CollapsibleDetails } from '../_shared/vizKit';
import { recordScene, SceneView, SceneInspector, sceneVerdict } from '../imported/prepScene';
import type { PrepProblem } from '../imported/prepFactory';
import { recordTrace, TraceView, traceVerdict, makeGoInspector } from './anim/codeTrace';
import type { GoConcept, GoTopic } from './types';

/**
 * Adapt a GoConcept to the PrepProblem shape the Scene player consumes, folding
 * the key points into `notes` and (when present) the design Q&A into `approaches`
 * so both surface as collapsible blocks in the inspector. The recall-first Go
 * Course has no design Q&A, so `approaches` stays empty there; the OpenRTB course
 * supplies one.
 */
function toPrepProblem(c: GoConcept, topic: GoTopic, courseTitle: string): PrepProblem {
  const notes = c.keyPoints.length ? `- ${c.keyPoints.join('\n- ')}` : '';
  const approaches = c.design ? `${c.design.prompt}\n\nModel answer\n${c.design.answer}` : '';
  return {
    id: c.id,
    topic: topic.id,
    topicTitle: topic.title,
    course: courseTitle,
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

/** Append the concept's key points (and design Q&A, when present) under the Scene inspector. */
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
          {p.notes && (
            <CollapsibleDetails title="Key points" body={p.notes} maxHeightClass="max-h-[240px]" />
          )}
          {p.approaches && (
            <CollapsibleDetails
              title="Design question & model answer"
              body={p.approaches}
              maxHeightClass="max-h-[240px]"
            />
          )}
        </VarGrid>
      </>
    );
  };
}

/**
 * Turn a hand-authored concept into a generic ProblemPlugin: the Scene player
 * animates the mnemonic (Scene → How it runs → Memorize → Complexity) and the Go
 * sample drives the Code Studio Source view and the Assemble/Recall reassembly.
 * A quiz is wired only when the concept ships one — the recall-first Go Course
 * omits it (so the Quiz tab is hidden), while the OpenRTB course supplies it.
 */
export function makeGoConceptPlugin(
  c: GoConcept,
  topic: GoTopic,
  courseTitle = 'Go Course',
): ProblemPlugin<any, any> {
  const meta = {
    id: c.id,
    title: c.title,
    difficulty: c.difficulty,
    tags: c.tags,
    summary: c.summary,
  };
  const code = { text: c.code, lang: 'go', file: 'main.go' };
  const codePieces = codePiecesFromSource(c.code);
  const quiz = c.quiz && c.quiz.length > 0 ? { quiz: c.quiz } : {};

  // Concepts with an authored walkthrough get the narrative walkthrough player
  // (step caption + evolving state rail); the rest fall back to the Scene
  // mnemonic reveal.
  if (c.walkthrough && c.walkthrough.length > 0) {
    return definePlugin<GoConcept, any>({
      meta,
      inputs: [{ id: 'trace', label: 'Trace', value: c }],
      record: recordTrace,
      View: TraceView,
      Inspector: makeGoInspector(c),
      verdict: traceVerdict,
      code,
      codePieces,
      ...quiz,
    });
  }

  const p = toPrepProblem(c, topic, courseTitle);
  return definePlugin<PrepProblem, any>({
    meta,
    inputs: [{ id: 'concept', label: 'Concept', value: p }],
    record: recordScene,
    View: SceneView,
    Inspector: withGoNotes(SceneInspector, p),
    verdict: sceneVerdict,
    code,
    codePieces,
    ...quiz,
  });
}
