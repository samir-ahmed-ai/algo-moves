import { useCallback, useEffect, useRef, useState } from 'react';
import { COPY_FEEDBACK_MS } from '@/shell/copyFeedback';

/** Copy-to-clipboard with timed success feedback. */
export function useCopyFeedback(durationMs = COPY_FEEDBACK_MS) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), durationMs);
        return true;
      } catch {
        return false;
      }
    },
    [durationMs],
  );

  return { copied, copy, reset: () => setCopied(false) };
}
