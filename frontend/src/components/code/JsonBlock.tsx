import { cn } from '@/lib/utils/cn';
import { formatJsonDisplay } from '@/lib/utils/formatJsonDisplay';
import { highlightJson } from '@/lib/utils/highlightJson';
import { nodeText } from '@/design/typography';

export interface JsonBlockProps {
  value: unknown;
  /** CSS max-height for the scroll container. Default: 320px. */
  maxHeight?: string;
  size?: 'sm' | 'xs';
  variant?: 'panel' | 'nested';
  className?: string;
}

/** Read-only pretty-printed JSON with vertical scroll. */
export function JsonBlock({
  value,
  maxHeight = '320px',
  size = 'sm',
  variant = 'panel',
  className,
}: JsonBlockProps) {
  const text = formatJsonDisplay(value);
  if (!text) return null;

  const pre = (
    <pre
      style={{ maxHeight }}
      className={cn(
        'json-block nodrag ws-scroll m-0 overflow-auto font-mono leading-relaxed text-ink2',
        size === 'xs' ? nodeText.xs : nodeText.sm,
        variant === 'panel' && 'rounded-md border border-edge/60 bg-panel2/50 p-2',
        variant === 'nested' && 'rounded-sm bg-panel2/30 p-1.5',
        className,
      )}
    >
      <code>{highlightJson(text)}</code>
    </pre>
  );

  if (variant === 'panel') {
    return <div className="overflow-hidden">{pre}</div>;
  }

  return pre;
}
