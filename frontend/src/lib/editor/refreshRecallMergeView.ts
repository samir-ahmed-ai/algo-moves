import type { MergeView } from '@codemirror/merge';
import {
  buildRecallMergeReconfigure,
  type RecallMergeViewOptions,
} from '@/lib/code/recallMergeDiff';

/** Re-run merge diff + layout with recall trim-per-line comparison. */
export function refreshRecallMergeView(
  view: MergeView | null | undefined,
  options?: RecallMergeViewOptions,
): void {
  view?.reconfigure(buildRecallMergeReconfigure(options));
}
