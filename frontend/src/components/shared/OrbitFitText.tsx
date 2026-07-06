import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  fitOrbitMultilineLayout,
  orbitLineDy,
  orbitTextSpan,
  ORBIT_FONT,
  type OrbitTextLayout,
} from './orbitArc';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Arc caption: start big, shrink (and wrap) until the text fits from arc start to end. */
export function OrbitFitText({
  text,
  pathId,
  slot,
  className,
  dy = slot === 'center' ? -9 : 8,
  onClick,
}: {
  text: string;
  pathId: string;
  slot: 'center' | 'side';
  className?: string;
  dy?: number;
  onClick?: () => void;
}) {
  const measureRef = useRef<SVGTextElement>(null);
  const { max, min, maxLines } = ORBIT_FONT[slot];
  const { startOffset, textAnchor, budget } = orbitTextSpan(slot);
  const [layout, setLayout] = useState<OrbitTextLayout>(() => ({
    fontSize: max,
    lines: text.trim() ? [{ text: text.trim(), stretch: true }] : [],
  }));
  const [renderSize, setRenderSize] = useState<number>(max);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el || !text.trim()) {
      setLayout({ fontSize: max, lines: [] });
      setRenderSize(max);
      return;
    }

    const measureLine = (line: string, fontSize: number) => {
      el.style.fontSize = `${fontSize}px`;
      el.textContent = line;
      return el.getComputedTextLength();
    };

    const fitted = fitOrbitMultilineLayout(measureLine, text, max, min, budget, maxLines);
    if (prefersReducedMotion() || fitted.fontSize >= max) {
      setLayout(fitted);
      setRenderSize(fitted.fontSize);
      return;
    }

    const atMax = fitOrbitMultilineLayout(measureLine, text, max, max, budget, maxLines);
    setLayout(atMax);
    setRenderSize(max);
    const id = requestAnimationFrame(() => {
      setLayout(fitted);
      setRenderSize(fitted.fontSize);
    });
    return () => cancelAnimationFrame(id);
  }, [text, max, min, budget, maxLines]);

  if (!layout.lines.length) return null;

  return (
    <>
      <text ref={measureRef} className={className} visibility="hidden" aria-hidden="true" />
      <g
        className={cn('move-orbit-caption', className)}
        onClick={onClick}
        onPointerDown={onClick ? (e: ReactPointerEvent) => e.stopPropagation() : undefined}
      >
        {layout.lines.map((line, i) => (
          <text
            key={`${line.text}-${i}`}
            dy={orbitLineDy(slot, dy, i, layout.lines.length, renderSize)}
            style={{ fontSize: renderSize }}
          >
            <textPath
              href={`#${pathId}`}
              startOffset={startOffset}
              textAnchor={textAnchor}
              {...(line.stretch ? { textLength: budget, lengthAdjust: 'spacing' as const } : {})}
            >
              {line.text}
            </textPath>
          </text>
        ))}
      </g>
    </>
  );
}
