import type { CSSProperties } from 'react';
import type { Item } from '../../../content';
import { cn } from '@/lib/utils/cn';
import { glyphFor } from '../../../content/problemShape';

/**
 * The little mnemonic picture for a problem, drawn the exact same way the topic
 * board and home page draw it (0 0 48 48 viewBox, currentColor strokes). `float`
 * gives the hero card a gentle bob.
 */
export function ProblemGlyph({
  item,
  className,
  style,
  strokeWidth = 1.7,
  float = false,
}: {
  item: Item;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  float?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn('problem-glyph', float && 'mobile-glyph-float problem-glyph--float', className)}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: glyphFor(item) }}
    />
  );
}
