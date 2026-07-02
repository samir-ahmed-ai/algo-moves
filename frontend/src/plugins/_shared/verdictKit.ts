import type { Verdict } from '../../core/types';

/**
 * Verdict for plugins that always succeed once the algorithm runs to completion —
 * the common case for sorts, traversals and constructive algorithms. Replaces the
 * `() => ({ ok: true, label })` closure that each such plugin used to hand-roll.
 */
export function verdictAlwaysOk(label: string): () => Verdict {
  return () => ({ ok: true, label });
}
