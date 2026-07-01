import { useMemo, useState } from 'react';
import { Check, ChevronDown, Play, Search, Trophy } from 'lucide-react';
import { catalog, type Course, type Item, type Topic } from '../../content';
import { useProgress, statFor, type ProgressData } from '../../lib/progress';
import { cn } from '../../lib/cn';
import { courseIcon } from '../courseIcon';
import { ProblemGlyph } from './ProblemGlyph';
import { deckSummary } from './deckModel';
import { loadMobileSession } from './mobileSession';

function drillable(topic: Topic): Item[] {
  return topic.items.filter((i) => i.pluginId);
}

function masteredCount(items: Item[], progress: ProgressData): number {
  return items.filter((i) => statFor(progress, i.id).mastered).length;
}

const DIFF_DOT: Record<string, string> = {
  Easy: 'var(--good)',
  Medium: 'var(--edge-active)',
  Hard: 'var(--bad)',
};

/* ------------------------------------------------------------- topic card */

function TopicCard({
  topic,
  progress,
  onPick,
}: {
  topic: Topic;
  progress: ProgressData;
  onPick: (topic: Topic, startItemId?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => drillable(topic), [topic]);
  const summary = useMemo(() => deckSummary(topic), [topic]);
  if (items.length === 0) return null;
  const mastered = masteredCount(items, progress);
  const pct = items.length ? mastered / items.length : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-edge bg-panel">
      <button
        type="button"
        onClick={() => onPick(topic)}
        className="flex w-full items-stretch gap-3 p-3 text-left transition-colors active:bg-panel2"
      >
        {/* glyph stack preview */}
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-panel2 text-ink2">
          {items[0] && <ProblemGlyph item={items[0]} className="h-8 w-8" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{topic.title}</h3>
            {mastered > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-goodbg px-2 py-0.5 text-[11px] font-semibold text-good">
                <Trophy className="h-3 w-3" />
                {mastered}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-ink3">
            <span>
              {items.length} problem{items.length === 1 ? '' : 's'}
            </span>
            <span className="h-1 w-1 rounded-full bg-edge2" />
            <span className="inline-flex -space-x-0.5">
              {items.slice(0, 8).map((it) => (
                <span
                  key={it.id}
                  className="h-2 w-2 rounded-full ring-1 ring-[var(--surface)]"
                  style={{ background: DIFF_DOT[it.difficulty ?? ''] ?? 'var(--border-strong)' }}
                />
              ))}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {summary.totalQuiz > 0 && (
              <span className="rounded-full bg-accentbg px-2 py-0.5 text-[10px] font-medium text-accent">
                {summary.totalQuiz} quiz
              </span>
            )}
            {summary.withReassemble > 0 && (
              <span className="rounded-full bg-panel2 px-2 py-0.5 text-[10px] font-medium text-ink3">
                {summary.withReassemble} rebuild
              </span>
            )}
            {summary.totalQuiz === 0 && summary.withReassemble === 0 && (
              <span className="rounded-full bg-panel2 px-2 py-0.5 text-[10px] font-medium text-ink3">animate only</span>
            )}
          </div>
          {/* progress track */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-panel2">
            <div className="h-full rounded-full bg-good transition-[width] duration-500" style={{ width: `${pct * 100}%` }} />
          </div>
        </div>
        <span className="grid w-9 shrink-0 place-items-center rounded-xl bg-accent text-white">
          <Play className="h-4 w-4" />
        </span>
      </button>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-1 border-t border-edge py-1.5 text-[11.5px] font-medium text-ink3 transition-colors hover:text-ink"
      >
        {open ? 'Hide' : 'See'} problems
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul className="border-t border-edge">
          {items.map((it) => {
            const done = statFor(progress, it.id).mastered;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onPick(topic, it.id)}
                  className="flex w-full items-center gap-3 border-b border-edge px-3 py-2 text-left last:border-b-0 transition-colors active:bg-panel2"
                >
                  <ProblemGlyph item={it} className="h-6 w-6 shrink-0 text-ink2" />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink2">{it.title}</span>
                  {it.difficulty && (
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DIFF_DOT[it.difficulty] ?? 'var(--border-strong)' }} />
                  )}
                  {done && <Check className="h-4 w-4 shrink-0 text-good" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ browse */

export function MobileBrowse({
  onPick,
}: {
  onPick: (topic: Topic, startItemId?: string, initialPIdx?: number, initialCIdx?: number) => void;
}) {
  const progress = useProgress();
  const [query, setQuery] = useState('');
  const resume = loadMobileSession();
  const resumeTopic = resume ? catalog.getTopic(resume.topicId) : undefined;

  const allItems = useMemo(() => catalog.items.filter((i) => i.pluginId), []);
  const totals = useMemo(() => {
    const mastered = allItems.filter((i) => statFor(progress, i.id).mastered).length;
    return { mastered, total: allItems.length };
  }, [allItems, progress]);

  const q = query.trim().toLowerCase();
  const courses = useMemo(() => {
    if (!q) return catalog.courses;
    // Keep a course/topic if any problem title, topic title, or course title matches.
    return catalog.courses
      .map((c): Course | null => {
        if (c.title.toLowerCase().includes(q)) return c;
        const topics = c.topics.filter(
          (t) => t.title.toLowerCase().includes(q) || drillable(t).some((it) => it.title.toLowerCase().includes(q)),
        );
        return topics.length ? { ...c, topics } : null;
      })
      .filter((c): c is Course => c !== null);
  }, [q]);

  return (
    <div className="ws-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-10">
      {/* hero */}
      <div className="relative mt-1 overflow-hidden rounded-2xl border border-edge bg-panel p-4">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: 'radial-gradient(70% 90% at 90% 0%, var(--accent-bg) 0%, transparent 60%)' }}
        />
        <div className="relative">
          <h1 className="text-[20px] font-semibold leading-tight tracking-tight text-ink">Swipe to master</h1>
          <p className="mt-1 text-[12.5px] text-ink2">Pick a category — animate, quiz, rebuild.</p>
          {resumeTopic && (
            <button
              type="button"
              onClick={() => onPick(resumeTopic, resume!.itemId, resume!.pIdx, resume!.cIdx)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[14px] font-semibold text-white"
            >
              <Play className="h-4 w-4" />
              Continue {resumeTopic.title}
              <span className="text-[12px] font-normal opacity-90">· problem {resume!.pIdx + 1}</span>
            </button>
          )}
          <div className={cn('flex items-center gap-2', resumeTopic ? 'mt-3' : 'mt-3')}>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel2">
              <div className="h-full rounded-full bg-good transition-[width] duration-700" style={{ width: `${totals.total ? (totals.mastered / totals.total) * 100 : 0}%` }} />
            </div>
            <span className="shrink-0 text-[12px] font-medium tabular-nums text-ink2">
              {totals.mastered}/{totals.total} mastered
            </span>
          </div>
        </div>
      </div>

      {/* search */}
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search problems or categories…"
          className="w-full rounded-xl border border-edge bg-panel py-2.5 pl-9 pr-3 text-[14px] text-ink outline-none placeholder:text-ink3 focus:border-accent"
        />
      </div>

      {/* courses */}
      <div className="mt-4 flex flex-col gap-5">
        {courses.map((course) => {
          const topics = course.topics.filter((t) => drillable(t).length > 0);
          if (topics.length === 0) return null;
          const Icon = courseIcon(course.icon);
          const courseItems = topics.flatMap(drillable);
          const cm = masteredCount(courseItems, progress);
          return (
            <section key={course.id}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accentbg text-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <h2 className="min-w-0 flex-1 truncate text-[13px] font-semibold uppercase tracking-wide text-ink2">{course.title}</h2>
                <span className="shrink-0 text-[11.5px] text-ink3">
                  {cm}/{courseItems.length}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {topics.map((t) => (
                  <TopicCard key={t.id} topic={t} progress={progress} onPick={onPick} />
                ))}
              </div>
            </section>
          );
        })}
        {courses.length === 0 && <p className="px-1 py-8 text-center text-[14px] text-ink3">No matches for “{query}”.</p>}
      </div>
    </div>
  );
}
