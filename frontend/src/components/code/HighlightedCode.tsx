import { useEffect, useState, type ReactNode } from 'react';
import { highlightSnippetPlain, highlightSnippetShiki } from '@/lib/editor';
import { cn } from '@/lib/utils/cn';

export interface HighlightedCodeProps {
  code: string;
  lang?: string;
  wrap?: boolean;
  /** VS Code-style per-line gutter numbers inside the cell. */
  gutter?: boolean;
  className?: string;
}

/** Read-only syntax-colored snippet sized to its content (lazy Shiki). */
export function HighlightedCode({
  code,
  lang = 'go',
  wrap = false,
  gutter = false,
  className,
}: HighlightedCodeProps) {
  const [content, setContent] = useState<ReactNode>(() =>
    highlightSnippetPlain(code, lang, { gutter }),
  );

  useEffect(() => {
    let cancelled = false;
    void highlightSnippetShiki(code, lang, { gutter }).then((node) => {
      if (!cancelled) setContent(node);
    });
    return () => {
      cancelled = true;
    };
  }, [code, lang, gutter]);

  return (
    <div
      role="code"
      className={cn(
        'piece-code',
        'highlighted-code',
        wrap && 'piece-code-wrap',
        gutter && 'piece-code-guttered',
        className,
      )}
    >
      {content}
    </div>
  );
}
