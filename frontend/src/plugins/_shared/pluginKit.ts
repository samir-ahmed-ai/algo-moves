export { createSortRecorder, type SortInput, type SortState } from './sortRecorder';
export { SortInspector, type SortInspectorState } from './sortInspector';
export { GraphInspector, GraphStatRow } from './graphInspector';
export { createRecorder, type Recorder } from './createRecorder';
export * from './arrayPatterns';
export * from './treeRecord';
export * from './graphRecord';
export * from './gridRecord';
import type { ComponentType } from 'react';
import type { CodePiece } from '@/lib/code';
import type { Frame, PluginTab, PluginWires, QuizQuestion, SampleInput, Verdict } from '../../core/types';
import { splitCodeIntoPieces } from '@/lib/code';
import { makeCasesPanel, makeQuizPanel, makeSimulatePanel, type WorkedCase } from './practice';

/** Teaching content bundle for a plugin (native or imported). */
export interface PracticeBundle<I = unknown> {
  quiz?: QuizQuestion[];
  codePieces?: CodePiece[];
  cases?: {
    good: WorkedCase<I>[];
    bad?: WorkedCase<I>[];
    goodLabel?: string;
    badLabel?: string;
    intro?: string;
  };
  simulateQuestion?: string;
}

export interface TeachingStackConfig<I, S> {
  record: (input: I) => Frame<S>[];
  View: ComponentType<{ frame: Frame<S> }>;
  inputs: SampleInput<I>[];
  verdict?: (frames: Frame<S>[]) => Verdict;
  practice: PracticeBundle<I>;
  /** When true, simulate tab renders in the side dock (wide graph layouts). */
  simulateSide?: boolean;
}

export interface TeachingStackResult {
  tabs: PluginTab[];
  wires: PluginWires;
  quiz?: QuizQuestion[];
  codePieces?: CodePiece[];
}

/** Auto-generate codePieces from Go source when not hand-authored. */
export function codePiecesFromSource(source: string): CodePiece[] | undefined {
  return splitCodeIntoPieces(source) ?? undefined;
}

/**
 * Wire the standard learn stack: Cases (visualize) + Quiz + Simulate (practice),
 * plus quiz/codePieces for Code Studio phases.
 */
export function wireTeachingStack<I, S>(config: TeachingStackConfig<I, S>): TeachingStackResult {
  const { record, View, inputs, verdict, practice, simulateSide } = config;
  const tabs: PluginTab[] = [];
  const quiz = practice.quiz;
  const codePieces = practice.codePieces;

  if (practice.cases && practice.cases.good.length > 0) {
    tabs.push({
      id: 'cases',
      label: 'Cases',
      mode: 'visualize',
      Panel: makeCasesPanel({
        record,
        View,
        good: practice.cases.good,
        bad: practice.cases.bad,
        goodLabel: practice.cases.goodLabel,
        badLabel: practice.cases.badLabel,
        intro: practice.cases.intro,
      }),
    });
  }

  if (quiz && quiz.length > 0) {
    tabs.push({ id: 'quiz', label: 'Quiz', mode: 'practice', Panel: makeQuizPanel(quiz) });
  }

  if (inputs.length > 0) {
    tabs.push({
      id: 'simulate',
      label: 'Simulate',
      mode: 'practice',
      side: simulateSide,
      Panel: makeSimulatePanel({
        inputs,
        record,
        View,
        question: practice.simulateQuestion,
        verdict,
      }),
    });
  }

  const wires: PluginWires = {};
  if (practice.cases?.good.length) {
    wires.visualize = [['workbench', 'cases']];
  }
  if (quiz?.length && inputs.length > 0) {
    wires.practice = [
      ['quiz', 'simulate'],
      ['simulate', 'predict'],
    ];
  }

  return { tabs, wires, quiz, codePieces };
}

/** Standard View + Inspector pair for native/imported simulators. */
export function definePluginView<S>(config: {
  View: ComponentType<{ frame: Frame<S> }>;
  Inspector: ComponentType<{ frame: Frame<S> | null }>;
}): { View: ComponentType<{ frame: Frame<S> }>; Inspector: ComponentType<{ frame: Frame<S> | null }> } {
  return config;
}
