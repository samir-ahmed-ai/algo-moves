import { highlightSnippet } from '../lib/highlightSnippet';
import { cn } from '../lib/cn';

export interface HighlightedCodeProps {
  code: string;
  lang?: string;
  wrap?: boolean;
  className?: string;
}

/** Read-only syntax-colored snippet sized to its content. */
export function HighlightedCode({ code, lang = 'go', wrap = false, className }: HighlightedCodeProps) {
  return (
    <div role="code" className={cn('piece-code', wrap && 'piece-code-wrap', className)}>
      {highlightSnippet(code, lang)}
    </div>
  );
}
