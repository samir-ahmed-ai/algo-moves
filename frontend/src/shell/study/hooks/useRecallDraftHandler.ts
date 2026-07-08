import { useCallback } from 'react';
import { strictRecallDraft } from '@/lib/code';
import { useCodeStudioContent, useCodeStudioDraft, useCodeStudioEditor } from './useCodeStudio';

/** Gate a draft value through strict-recall mode: on a mistake it resets to empty. */
export function applyStrictRecall(reference: string, next: string, strict: boolean): string {
  return strict ? strictRecallDraft(reference, next) : next;
}

/**
 * The onDraftChange handler for recall editors. With Strict recall enabled, any typing
 * mistake resets the whole attempt to empty (reset-on-mistake study mode); otherwise the raw
 * value is persisted. The editor⇄state sync then mirrors the reset in the visible editor.
 */
export function useRecallDraftHandler(): (next: string) => void {
  const { reference } = useCodeStudioContent();
  const { persistDraft } = useCodeStudioDraft();
  const { editorPrefs } = useCodeStudioEditor();
  const strict = editorPrefs.strictRecall;

  return useCallback(
    (next: string) => persistDraft(applyStrictRecall(reference, next, strict)),
    [persistDraft, reference, strict],
  );
}
