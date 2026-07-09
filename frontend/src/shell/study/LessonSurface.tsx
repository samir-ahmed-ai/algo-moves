import { Fragment, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Circle, Clock } from 'lucide-react';
import type { Item } from '@/content';
import { catalog } from '@/content';
import { getLesson, type LessonBlock } from '@/content/lessons';
import { useWorkspace } from '@/store/workspace';
import { markRead, unmarkRead, useReadings, readFor } from '@/store/persistence';
import { HighlightedCode } from '@/components/code/HighlightedCode';
import { cn } from '@/lib/utils/cn';

/** Renders a `kind:'reading'` lesson on its own surface — no plugin, no frame. */
export function LessonSurface({ item }: { item: Item }) {
  const { backToBrowse, openProblem } = useWorkspace();
  const readings = useReadings();
  const lesson = getLesson(item.lessonId ?? item.id);
  const done = readFor(readings, item.id);
  const next = catalog.adjacent(item.id).next;

  if (!lesson) {
    return (
      <div className="grid h-full w-full place-items-center bg-bg p-6 text-ink3">
        <span>Lesson content unavailable.</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <header className="flex shrink-0 items-center gap-2 border-b border-edge px-3 py-2">
        <button
          type="button"
          onClick={backToBrowse}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-ink3 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <span className="text-edge">/</span>
        <BookOpen className="h-3.5 w-3.5 text-accent" />
        <span className="truncate text-sm font-semibold text-ink">{lesson.title}</span>
        {lesson.estimatedMinutes != null && (
          <span className="ml-auto flex items-center gap-1 text-xs text-ink3">
            <Clock className="h-3 w-3" />
            {lesson.estimatedMinutes} min read
          </span>
        )}
      </header>

      <div className="ws-scroll min-h-0 flex-1 overflow-auto">
        <article className="mx-auto max-w-[68ch] px-5 py-6">
          <h1 className="mb-1 text-2xl font-bold text-ink">{lesson.title}</h1>
          {lesson.summary && <p className="mb-5 text-ink3">{lesson.summary}</p>}
          {lesson.blocks.map((block, i) => (
            <LessonBlockView key={i} block={block} onOpenProblem={openProblem} />
          ))}
        </article>
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-edge px-3 py-2">
        <button
          type="button"
          onClick={() => (done ? unmarkRead(item.id) : markRead(item.id))}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-semibold transition-colors',
            done
              ? 'border-good/40 bg-goodbg text-good'
              : 'border-edge bg-panel2 text-ink2 hover:text-ink',
          )}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          {done ? 'Read' : 'Mark as read'}
        </button>
        <span className="flex-1" />
        {next && (
          <button
            type="button"
            onClick={() => {
              if (!done) markRead(item.id);
              openProblem(next.id);
            }}
            className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-sm font-semibold text-[var(--accent-contrast)] hover:opacity-90"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </footer>
    </div>
  );
}

const CALLOUT_TONE: Record<string, string> = {
  note: 'border-accent/30 bg-accent/5 text-ink',
  remember: 'border-good/30 bg-goodbg text-ink',
  warn: 'border-warn/40 bg-warnbg text-ink',
};

function LessonBlockView({
  block,
  onOpenProblem,
}: {
  block: LessonBlock;
  onOpenProblem: (id: string) => void;
}) {
  switch (block.kind) {
    case 'heading':
      return block.level === 2 ? (
        <h2 className="mb-2 mt-6 text-lg font-bold text-ink">{block.text}</h2>
      ) : (
        <h3 className="mb-1.5 mt-4 text-base font-semibold text-ink">{block.text}</h3>
      );
    case 'prose':
      return <p className="mb-3 leading-relaxed text-ink2">{renderInline(block.text)}</p>;
    case 'callout':
      return (
        <div className={cn('mb-4 rounded-lg border px-3 py-2.5', CALLOUT_TONE[block.tone])}>
          {block.title && <div className="mb-0.5 text-sm font-bold">{block.title}</div>}
          <div className="text-sm leading-relaxed text-ink2">{renderInline(block.text)}</div>
        </div>
      );
    case 'code':
      return (
        <figure className="mb-4">
          <div className="overflow-x-auto rounded-lg border border-edge bg-panel2 p-3">
            <HighlightedCode code={block.code} lang={block.lang} />
          </div>
          {block.caption && (
            <figcaption className="mt-1 text-xs text-ink3">{block.caption}</figcaption>
          )}
        </figure>
      );
    case 'list':
      return block.ordered ? (
        <ol className="mb-3 ml-5 list-decimal space-y-1 text-ink2 marker:text-ink3">
          {block.items.map((it, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(it)}
            </li>
          ))}
        </ol>
      ) : (
        <ul className="mb-3 ml-5 list-disc space-y-1 text-ink2 marker:text-ink3">
          {block.items.map((it, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(it)}
            </li>
          ))}
        </ul>
      );
    case 'steps':
      return (
        <ol className="mb-4 space-y-2">
          {block.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                {i + 1}
              </span>
              <span className="leading-relaxed text-ink2">
                {s.title && <span className="font-semibold text-ink">{s.title} — </span>}
                {renderInline(s.caption)}
              </span>
            </li>
          ))}
        </ol>
      );
    case 'keyPoints':
      return (
        <div className="mb-4 rounded-lg border border-edge bg-panel2 px-3 py-2.5">
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-ink3">Key points</div>
          <ul className="ml-4 list-disc space-y-1 text-sm text-ink2 marker:text-accent">
            {block.points.map((p, i) => (
              <li key={i}>{renderInline(p)}</li>
            ))}
          </ul>
        </div>
      );
    case 'problemRef': {
      const target = catalog.getItem(block.itemId);
      return (
        <button
          type="button"
          onClick={() => onOpenProblem(block.itemId)}
          className="mb-4 flex w-full items-center gap-2 rounded-lg border border-edge bg-panel2 px-3 py-2 text-left transition-colors hover:border-accent"
        >
          <ArrowRight className="h-4 w-4 shrink-0 text-accent" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">
              {target?.title ?? block.itemId}
            </span>
            {block.note && <span className="block text-xs text-ink3">{block.note}</span>}
          </span>
        </button>
      );
    }
  }
}

const INLINE = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

/** Safe inline markdown: **bold**, _em_, `code`, [label](url). No raw HTML. */
function renderInline(text: string): ReactNode[] {
  const parts = text.split(INLINE);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-panel2 px-1 py-0.5 font-mono text-[0.85em] text-accent">
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link && link[2] && /^https?:\/\//.test(link[2])) {
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-accent underline underline-offset-2"
        >
          {link[1]}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
