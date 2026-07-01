import type { ComponentType } from 'react';
import type { Frame, InspectorProps, PluginViewProps, SampleInput, Verdict } from '../../../core/types';
import type { PracticeBundle } from '../../_shared/pluginKit';

/**
 * A real, step-by-step simulation for an imported reference problem. When the
 * factory finds a simulator whose `manifestId` matches an imported problem (and
 * the problem is in the right category), it swaps the static ConceptView out for
 * this animated `record` + `View`, keeping the imported meta and Go `code`.
 *
 * The registry is heterogeneous (every problem has its own input/state shape),
 * so the boundary type is intentionally `any`; author each problem file with
 * concrete internal types and assign the result here.
 */
export interface ProblemSimulator {
  /** Concrete sample inputs the run uses (keep them SMALL so the board reads). */
  inputs: SampleInput<any>[];
  /** Re-implements the problem, emitting one frame per meaningful step. */
  record: (input: any) => Frame<any>[];
  /** Renders a frame — graph board, array row, grid, etc. */
  View: ComponentType<PluginViewProps<any>>;
  Inspector?: ComponentType<InspectorProps<any>>;
  verdict?: (frames: Frame<any>[]) => Verdict;
  /** Optional teaching bundle (cases, quiz overrides, simulate prompt). */
  practice?: PracticeBundle;
}

/** Shape each `simulators/problems/*.tsx` file must export. */
export interface ProblemModule {
  /** Must equal the imported manifest `id` (e.g. imp-58-climbing-stairs). */
  manifestId: string;
  /** Legacy title match — kept for files not yet migrated to manifestId. */
  title?: string;
  simulator: ProblemSimulator;
  practice?: PracticeBundle;
}

/** @deprecated Use ProblemSimulator */
export type DpSimulator = ProblemSimulator;

/** @deprecated Use ProblemModule */
export type DpModule = ProblemModule;
