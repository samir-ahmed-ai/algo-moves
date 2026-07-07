/** Shared helpers for prep ask lines and problem brief generation. */

const ASK_VERBS = new Set([
  'find',
  'return',
  'compute',
  'count',
  'determine',
  'decide',
  'merge',
  'remove',
  'reverse',
  'rotate',
  'move',
  'trap',
  'check',
  'implement',
  'list',
  'generate',
  'insert',
  'delete',
  'search',
  'validate',
  'partition',
  'rearrange',
  'calculate',
  'evaluate',
  'identify',
  'detect',
  'add',
  'build',
  'construct',
  'convert',
  'copy',
  'clone',
  'schedule',
  'place',
  'fill',
  'write',
  'read',
  'parse',
  'decode',
  'encode',
  'sort',
  'group',
  'split',
  'combine',
  'pick',
  'choose',
  'select',
  'maximize',
  'minimize',
]);

export function ensurePeriod(s) {
  const t = (s ?? '').trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

export function stripNumberPrefix(raw) {
  const m = raw.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
  if (m) return { number: m[1], title: m[2].trim() };
  return { number: '', title: raw.trim() };
}

/** Turn a prep title (and optional slug) into a one-line problem ask. */
export function titleToAsk(rawTitle, slug) {
  const { title } = stripNumberPrefix(rawTitle);
  const first = title.split(/\s+/)[0]?.toLowerCase() ?? '';
  if (ASK_VERBS.has(first)) {
    const capped = title.charAt(0).toUpperCase() + title.slice(1);
    if (capped.length >= 12) return ensurePeriod(capped);
    if (slug) {
      const words = slug
        .replace(/-/g, ' ')
        .replace(/^find\s+/i, '')
        .trim();
      if (words) return ensurePeriod(`${capped} in the ${words}.`);
    }
    return ensurePeriod(capped);
  }
  if (slug) {
    const words = slug.replace(/-/g, ' ');
    return ensurePeriod(`Find the ${words}.`);
  }
  return ensurePeriod(`Solve: ${title}.`);
}

export function secondFromSummary(summary, first) {
  const trimmed = (summary ?? '').trim();
  if (!trimmed || trimmed.length < 12) return undefined;

  const colonIdx = trimmed.indexOf(': ');
  if (colonIdx > 0 && colonIdx < trimmed.length - 3) {
    const second = trimmed.slice(colonIdx + 2).trim();
    if (second.length >= 12 && !first.includes(second)) return ensurePeriod(second);
  }

  const dotMatch = trimmed.match(/^[^.!?]+[.!?]\s+(.+)$/s);
  if (dotMatch?.[1]) {
    const second = dotMatch[1].trim();
    if (second.length >= 12 && !first.includes(second)) return ensurePeriod(second);
  }

  if (trimmed.length >= 12 && trimmed !== first && !first.includes(trimmed)) {
    return ensurePeriod(trimmed);
  }

  return undefined;
}
