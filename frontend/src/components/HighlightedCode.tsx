import { highlightSnippet } from '@/lib/editor';
import { cn } from '@/lib/utils/cn';

export interface HighlightedCodeProps {
  code: string;
  lang?: string;
  wrap?: boolean;
  /** VS Code-style per-line gutter numbers inside the cell. */
  gutter?: boolean;
  className?: string;
}

/** Read-only syntax-colored snippet sized to its content. */
export function HighlightedCode({ code, lang = 'go', wrap = false, gutter = false, className }: HighlightedCodeProps) {
  return (
    <div role="code" className={cn('piece-code', wrap && 'piece-code-wrap', gutter && 'piece-code-guttered', className)}>
      {highlightSnippet(code, lang, { gutter })}
    </div>
  );
}
