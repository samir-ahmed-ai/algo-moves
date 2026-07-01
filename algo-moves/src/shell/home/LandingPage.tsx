import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  Code2,
  Command,
  Contrast,
  Eye,
  Flame,
  GraduationCap,
  LayoutGrid,
  Moon,
  Play,
  Smartphone,
  Sparkles,
  Sun,
  Target,
  Trophy,
} from 'lucide-react';
import { catalog, type Course, type Difficulty, type Item } from '../../content';
import { useProgress, statFor, type ProgressData } from '../../lib/progress';
import { readLastItemId, useWorkspace } from '../../lib/workspace';
import { cn } from '../../lib/cn';
import { courseIcon } from '../courseIcon';
import { glyphFor } from '../problemShape';
import { Chip, Meter } from '../canvas/nodeui';

/* ----------------------------------------------------------------- helpers */

const DIFFS: Difficulty[] = ['Easy', 'Medium', 'Hard'];
const DIFF_TONE: Record<Difficulty, string> = {
  Easy: 'var(--good)',
  Medium: 'var(--edge-active)',
  Hard: 'var(--bad)',
};

function courseProblems(course: Course): Item[] {
  return course.topics.flatMap((t) => t.items).filter((i) => i.pluginId);
}

function difficultyTally(items: Item[]): Record<Difficulty, number> {
  const t: Record<Difficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
  for (const i of items) if (i.difficulty) t[i.difficulty] += 1;
  return t;
}

/** Inner-SVG mnemonic glyph, drawn the same way the topic board draws it. */
function Glyph({ markup, className }: { markup: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

/* ------------------------------------------------------------------ pieces */

function IconButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-md border transition-colors [&>svg]:h-4 [&>svg]:w-4',
        active
          ? 'border-accent bg-accentbg text-accent'
          : 'border-edge text-ink3 hover:bg-panel2 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius)] border border-edge bg-panel/60 px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-panel2 text-accent [&>svg]:h-[18px] [&>svg]:w-[18px]">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-mono text-xl font-semibold tabular-nums leading-none text-ink">{value}</div>
        <div className="mt-1 truncate text-xs uppercase tracking-wide text-ink3">{label}</div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  cta,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start gap-2 rounded-[var(--radius)] border border-edge bg-panel/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-lg)]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-accentbg text-accent [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </span>
      <span className="mt-1 font-semibold text-ink">{title}</span>
      <span className="text-sm leading-snug text-ink2">{body}</span>
      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-accent">
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

function CourseCard({
  course,
  progress,
  onOpen,
}: {
  course: Course;
  progress: ProgressData;
  onOpen: () => void;
}) {
  const items = courseProblems(course);
  const mastered = items.filter((i) => statFor(progress, i.id).mastered).length;
  const tally = difficultyTally(items);
  const Icon = courseIcon(course.icon);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-3 rounded-[var(--radius)] border border-edge bg-panel/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-lg)]"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-edge bg-panel2 text-accent transition-colors group-hover:border-accent/40 [&>svg]:h-5 [&>svg]:w-5">
          <Icon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate font-semibold text-ink">{course.title}</h3>
            <span className="shrink-0 font-mono text-xs tabular-nums text-ink3">{items.length}</span>
          </div>
          {course.summary && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink3">{course.summary}</p>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3">
        <div className="flex-1">
          <Meter value={mastered} max={Math.max(items.length, 1)} tone="good" height={5} />
        </div>
        <div className="flex items-center gap-1.5">
          {DIFFS.map((d) =>
            tally[d] ? (
              <span key={d} className="flex items-center gap-1 font-mono text-[11px] tabular-nums text-ink3">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: DIFF_TONE[d] }} />
                {tally[d]}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </button>
  );
}

/** A small framed preview of the workspace, built from real problem glyphs. */
function WorkspacePreview({ featured }: { featured: Item[] }) {
  const nodes = featured.slice(0, 3);
  return (
    <div className="relative w-full overflow-hidden rounded-[var(--radius)] border border-edge bg-panel/70 shadow-[var(--shadow-xl)] backdrop-blur">
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
          <span className="h-2.5 w-2.5 rounded-full opacity-70" style={{ background: 'var(--edge-active)' }} />
          <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
        </span>
        <span className="ml-1 flex items-center gap-1.5 font-mono text-xs text-ink3">
          <Eye className="h-3 w-3" /> {nodes[0]?.title ?? 'Algorithm'} · Visualize
        </span>
      </div>
      <div
        className="relative grid grid-cols-3 gap-3 p-4"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, var(--edge) 1px, transparent 0)',
          backgroundSize: '16px 16px',
        }}
      >
        {nodes.map((item, i) => {
          const markup = glyphFor(item);
          return (
            <div
              key={item.id}
              className={cn(
                'relative flex flex-col items-center gap-2 rounded-md border border-edge bg-panel px-2 py-3',
                i === 1 && 'border-accent/60 shadow-[0_0_0_1px_var(--accent-bg)]',
              )}
            >
              <span className="absolute -top-1.5 left-2 font-mono text-[9px] text-ink3">{i + 1}</span>
              {markup ? (
                <Glyph markup={markup} className="h-8 w-8 text-ink2" />
              ) : (
                <LayoutGrid className="h-8 w-8 text-ink3" />
              )}
              <span className="line-clamp-1 text-center text-[11px] leading-tight text-ink3">{item.title}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-edge px-3 py-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
        <span className="truncate font-mono text-xs text-ink3">
          step 3 / 12 · coloring node {nodes[1]?.title ? '→ team B' : ''}
        </span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- landing */

export function LandingPage() {
  const { theme, setTheme, palette, setPalette, density, enterWorkspace, enterMobile, setActiveTopicId, setMode } =
    useWorkspace();
  const progress = useProgress();

  const problems = useMemo(() => catalog.items.filter((i) => i.pluginId), []);
  const featured = useMemo(() => {
    const picks: Item[] = [];
    for (const c of catalog.courses) {
      const it = courseProblems(c).find((i) => glyphFor(i));
      if (it) picks.push(it);
      if (picks.length >= 6) break;
    }
    return picks;
  }, []);

  const totals = useMemo(() => {
    const mastered = problems.filter((i) => statFor(progress, i.id).mastered).length;
    const attempted = problems.filter((i) => statFor(progress, i.id).attempts > 0).length;
    const bestStreak = problems.reduce((m, i) => Math.max(m, statFor(progress, i.id).bestStreak), 0);
    return { mastered, attempted, bestStreak };
  }, [problems, progress]);

  const [lastId] = useState(() => readLastItemId());
  const lastItem = lastId ? catalog.getItem(lastId) : undefined;
  const firstProblem = problems[0];

  const openItem = (id: string) => enterWorkspace(id);
  const browseCourse = (course: Course) => {
    const topicId = course.topics[0]?.id;
    if (topicId) setActiveTopicId(topicId);
    enterWorkspace();
  };
  const startIn = (mode: 'visualize' | 'learn') => {
    setMode(mode);
    if (firstProblem) enterWorkspace(firstProblem.id);
  };

  const lastCrumb = lastItem ? catalog.breadcrumb(lastItem.id) : undefined;

  return (
    <div data-density={density} className="ws-scroll h-full w-full overflow-y-auto bg-bg text-ink">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-edge bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight">Algo Moves</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <IconButton
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
            </IconButton>
            <IconButton
              title={palette === 'cb' ? 'Colour-blind palette: on' : 'Colour-blind palette: off'}
              active={palette === 'cb'}
              onClick={() => setPalette(palette === 'cb' ? 'default' : 'cb')}
            >
              <Contrast />
            </IconButton>
            <button
              type="button"
              onClick={() => enterWorkspace()}
              className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Open workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden border-b border-edge">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(60% 60% at 75% 0%, var(--accent-bg) 0%, transparent 60%)',
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel/60 px-3 py-1 text-xs font-medium text-ink2">
              <Sparkles className="h-3 w-3 text-accent" />
              Interview-ready algorithm practice
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              See every algorithm
              <br />
              <span className="text-accent">move&nbsp;by&nbsp;move.</span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink2">
              Step through {problems.length}+ classic interview problems as a replay on a live canvas —
              then learn the pattern, practise recall, and master it.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => openItem((lastItem ?? firstProblem)?.id ?? catalog.firstItemId)}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
              >
                <Play className="h-4 w-4" />
                {lastItem ? 'Resume learning' : 'Start learning'}
              </button>
              <button
                type="button"
                onClick={() => enterMobile()}
                className="inline-flex items-center gap-2 rounded-md border border-edge bg-panel/60 px-5 py-2.5 font-medium text-ink2 transition-colors hover:border-accent/50 hover:text-ink"
              >
                <Smartphone className="h-4 w-4" />
                Swipe mode
              </button>
              <button
                type="button"
                onClick={() =>
                  document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="inline-flex items-center gap-2 rounded-md border border-edge bg-panel/60 px-5 py-2.5 font-medium text-ink2 transition-colors hover:border-accent/50 hover:text-ink"
              >
                <BookOpen className="h-4 w-4" />
                Browse courses
              </button>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs text-ink3">
              <kbd className="rounded border border-edge bg-panel2 px-1.5 py-0.5 font-mono">⌘K</kbd>
              <span>opens the command palette anywhere in the workspace</span>
            </div>
          </div>
          <WorkspacePreview featured={featured} />
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        {/* stats */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={<BookOpen />} value={catalog.courses.length} label="Courses" />
          <StatCard icon={<LayoutGrid />} value={catalog.topics.length} label="Topics" />
          <StatCard icon={<Code2 />} value={problems.length} label="Problems" />
          <StatCard icon={<Target />} value={totals.attempted} label="Attempted" />
          <StatCard icon={<Trophy />} value={totals.mastered} label="Mastered" />
          <StatCard icon={<Flame />} value={totals.bestStreak} label="Best streak" />
        </section>

        {/* continue */}
        {lastItem && (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink3">Continue where you left off</h2>
            <button
              type="button"
              onClick={() => openItem(lastItem.id)}
              className="group flex w-full items-center gap-4 rounded-[var(--radius)] border border-edge bg-panel/60 p-4 text-left transition-all hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-lg)]"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-edge bg-panel2 text-ink2">
                {glyphFor(lastItem) ? (
                  <Glyph markup={glyphFor(lastItem)!} className="h-8 w-8 transition-colors group-hover:text-accent" />
                ) : (
                  <LayoutGrid className="h-7 w-7" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-ink">{lastItem.title}</span>
                  {lastItem.difficulty && (
                    <Chip tone={lastItem.difficulty === 'Easy' ? 'good' : lastItem.difficulty === 'Hard' ? 'bad' : 'accent'}>
                      {lastItem.difficulty}
                    </Chip>
                  )}
                  {statFor(progress, lastItem.id).mastered && (
                    <Trophy className="h-4 w-4" style={{ color: 'var(--good)' }} aria-label="mastered" />
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-ink3">
                  {lastCrumb?.course?.title}
                  {lastCrumb?.topic ? ` · ${lastCrumb.topic.title}` : ''}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
                Resume
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </section>
        )}

        {/* courses */}
        <section id="courses" className="mt-12 scroll-mt-20">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Courses</h2>
              <p className="text-sm text-ink3">Pick a track — each opens its problem grid.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.courses.map((course) => (
              <CourseCard key={course.id} course={course} progress={progress} onOpen={() => browseCourse(course)} />
            ))}
          </div>
        </section>

        {/* how it works */}
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold text-ink">Three ways to study every problem</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FeatureCard
              icon={<Eye />}
              title="Visualize"
              body="Replay the algorithm on a live canvas — graphs, grids, arrays and trees animate step by step."
              cta="Open the canvas"
              onClick={() => startIn('visualize')}
            />
            <FeatureCard
              icon={<GraduationCap />}
              title="Learn"
              body="Read the pattern, study the annotated code, and reassemble the solution from its pieces."
              cta="Open the studio"
              onClick={() => startIn('learn')}
            />
            <FeatureCard
              icon={<Target />}
              title="Practice"
              body="Predict each step, simulate inputs, and build a mastery streak that sticks."
              cta="Start practising"
              onClick={() => startIn('learn')}
            />
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="border-t border-edge">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-ink3 sm:flex-row sm:px-8">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Algo Moves — a plugin-based algorithm workspace.
          </span>
          <span className="flex items-center gap-1.5">
            <Command className="h-3.5 w-3.5" />
            Press <kbd className="rounded border border-edge bg-panel2 px-1 py-0.5 font-mono">?</kbd> in the
            workspace for shortcuts.
          </span>
        </div>
      </footer>
    </div>
  );
}
