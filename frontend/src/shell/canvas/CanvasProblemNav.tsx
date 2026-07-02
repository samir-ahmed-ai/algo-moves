import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Panel } from '@xyflow/react';
import { catalog, getSiblingItems, type Item } from '../../content';
import { useWorkspace } from '@/store/workspace';
import { cn } from '../../lib/cn';
import { chromeText } from '../chromeUi';
import { PROBLEM_GLYPHS } from '../../content/glyphs';

const DIFF_TONE: Record<string, string> = {
  Easy: 'var(--good)',
  Medium: 'var(--edge-active)',
  Hard: 'var(--bad)',
};

function glyphFor(item: Item): string | undefined {
  return PROBLEM_GLYPHS[item.id] ?? (item.pluginId ? PROBLEM_GLYPHS[item.pluginId] : undefined);
}

/**
 * Top-center problem switcher for the free-form canvas: flip between sibling
 * problems (the current topic, or the whole catalog when a topic has only one)
 * with wrap-around prev/next — without leaving the canvas.
 */
export function CanvasProblemNav() {
  const { activeItemId, openProblem } = useWorkspace();

  const list = useMemo(() => getSiblingItems(activeItemId, catalog), [activeItemId]);

  const idx = list.findIndex((i) => i.id === activeItemId);
  const item = list[idx];
  if (!item || list.length < 2) return null;

  const go = (delta: number) => {
    const n = (idx + delta + list.length) % list.length;
    openProblem(list[n].id);
  };

  const markup = glyphFor(item);

  return (
    <Panel position="top-center" className="!m-0 !top-2">
      <div className="nodrag flex items-center gap-0.5 rounded-full border border-edge bg-panel/95 px-1 py-0.5 shadow-[var(--shadow-lg)] backdrop-blur">
        <button
          type="button"
          onClick={() => go(-1)}
          title="Previous problem"
          aria-label="Previous problem"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 items-center gap-1.5 px-1">
          {markup && (
            <svg
              viewBox="0 0 48 48"
              className="h-4 w-4 shrink-0 text-ink2"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              dangerouslySetInnerHTML={{ __html: markup }}
            />
          )}
          <span className={cn('max-w-[220px] truncate font-medium text-ink', chromeText.sm)}>{item.title}</span>
          {item.difficulty && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: DIFF_TONE[item.difficulty] }}
              title={item.difficulty}
            />
          )}
          <span className={cn('shrink-0 font-mono tabular-nums text-ink3', chromeText.xs)}>
            {idx + 1}/{list.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          title="Next problem"
          aria-label="Next problem"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </Panel>
  );
}
