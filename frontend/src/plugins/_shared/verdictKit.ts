import type { Verdict } from '../../core/types';
import type { Frame } from '../../core/types';

/**
 * Verdict for plugins that always succeed once the algorithm runs to completion —
 * the common case for sorts, traversals and constructive algorithms. Replaces the
 * `() => ({ ok: true, label })` closure that each such plugin used to hand-roll.
 */
export function verdictAlwaysOk(label: string): () => Verdict {
  return () => ({ ok: true, label });
}

/**
 * Verdict based on whether the last recorded frame's move tone is not `bad`.
 * Used by search plugins where the final step signals success/failure via tone.
 */
export function verdictLastFrameTone(
  okLabel: string,
  badLabel: string,
): (frames: Frame[]) => Verdict {
  return (frames) => {
    const ok = frames[frames.length - 1]?.move.tone !== 'bad';
    return ok ? { ok: true, label: okLabel } : { ok: false, label: badLabel };
  };
}
