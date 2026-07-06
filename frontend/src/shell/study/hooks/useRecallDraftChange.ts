import { useCallback, useState } from 'react';
import { strictRecallDraft } from '@/lib/code';
import { hapticError } from '@/lib/utils/haptic';
import { recordAttempt } from '@/store/persistence';
import { useCanvasStatic } from '@/shell/canvas';
import { useCodeStudioContent, useCodeStudioDraft } from '../CodeStudio';

/**
 * Recall editor onChange — validates line-by-line and clears the attempt on mistake.
 * `mistakeTick` increments every time a mistake resets the draft, so callers can trigger a
 * one-shot shake/flash animation on the editor.
 */
export function useRecallDraftChange(): { onDraftChange: (v: string) => void; mistakeTick: number } {
  const { item } = useCanvasStatic();
  const { reference } = useCodeStudioContent();
  const { persistDraft } = useCodeStudioDraft();
  const [mistakeTick, setMistakeTick] = useState(0);

  const onDraftChange = useCallback(
    (v: string) => {
      const next = strictRecallDraft(reference, v);
      if (next === '' && v !== '') {
        hapticError();
        recordAttempt(item.id, false);
        setMistakeTick((t) => t + 1);
      }
      persistDraft(next);
    },
    [reference, persistDraft, item.id],
  );

  return { onDraftChange, mistakeTick };
}
