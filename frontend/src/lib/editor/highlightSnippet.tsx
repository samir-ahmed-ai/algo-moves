import type { ReactNode } from 'react';

export type { FuncLineTone } from './snippetMeta';
export { funcLineTone, pieceHasEntrySignature } from './snippetMeta';
export { highlightSnippetPlain, highlightSnippetShiki } from './shikiSnippet';

import { highlightSnippetPlain, highlightSnippetShiki } from './shikiSnippet';

/**
 * Syntax-colored markup for small reassemble snippets.
 * Prefer HighlightedCode (async Shiki); this sync export uses plain text until Shiki resolves.
 */
export function highlightSnippet(
  code: string,
  lang = 'go',
  opts?: { gutter?: boolean },
): ReactNode {
  return highlightSnippetPlain(code, lang.trim() || 'go', opts);
}

/** Async variant used by HighlightedCode once the lazy Shiki bundle is available. */
export { highlightSnippetShiki as highlightSnippetAsync };
