/** Shared quiz label quality rules used by quizChoiceFormat and integrity tests. */

export const GENERIC_DETAILS = new Set([
  'plausible distractor',
  'typical bound here',
  'typical for this pattern',
  'short rationale',
  'wrong approach here',
]);

export const BAD_HEADLINE_END =
  /\b(have|has|had|are|is|was|were|been|a|an|the|no|at|on|in|to|for|with|by|from|that|when|where|if|so|as|may|would|could|should|can|will|be|isn't|aren't|wasn't|weren't|of|and|or|not|its|it|dequeued|being|each|all|before|after|into|only|just|also|still|an|un)\s*$/i;

/** Broken bulk split: comma immediately before em dash. */
export const COMMA_BEFORE_DASH = /,\s*—/;

export const MIDWORD_ELLIPSIS = /\w…/;

export function truncateAtWord(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.lastIndexOf(' ', max - 1);
  return (cut > 8 ? t.slice(0, cut) : t.slice(0, max)).trim();
}
