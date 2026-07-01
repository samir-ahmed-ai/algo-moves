import type { ProblemPlugin, SampleInput } from '../core/types';

/** Per-sample-input frame counts for a plugin (used by Examples / Big-O panels). */
export type InputFrameCounts = ReadonlyMap<string, number>;

/** Compute frame counts for every sample input without caching side effects. */
export function computeInputFrameCounts<I, S>(plugin: ProblemPlugin<I, S>): InputFrameCounts {
  const counts = new Map<string, number>();
  for (const inp of plugin.inputs) {
    counts.set(inp.id, plugin.record(inp.value).length);
  }
  return counts;
}

/** Look up a single input's frame count; returns 0 when the id is unknown. */
export function inputFrameCount(counts: InputFrameCounts, inputId: string): number {
  return counts.get(inputId) ?? 0;
}

/** Stable dependency key for memoizing frame counts when plugin identity changes. */
export function inputFrameCountsKey(inputs: SampleInput<unknown>[]): string {
  return inputs.map((i) => i.id).join('\0');
}
