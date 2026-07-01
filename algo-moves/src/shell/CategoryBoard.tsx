import { Trophy, Boxes } from 'lucide-react';
import { catalog, type Course, type Difficulty, type Item, type Topic } from '../content';
import { useWorkspace } from '../lib/workspace';
import { useProgress, statFor } from '../lib/progress';
import { cn } from '../lib/cn';
import { courseIcon } from './courseIcon';
import { Meter, EmptyState, Chip, Label, Pill, difficultyTone } from './canvas/nodeui';
import { chromeText } from './chromeUi';
import { glyphFor } from './problemShape';

/* ------------------------------------------------------------- difficulty */

const RAIL: Record<Difficulty | 'unrated', string> = {
  Easy: 'var(--good)',
  Medium: 'var(--edge-active)',
  Hard: 'var(--bad)',
  unrated: 'var(--border-strong)',
};

/* ------------------------------------------------------------------ board */

export function CategoryBoard({ topic, course: courseProp }: { topic?: Topic; course?: Course }) {
  const { setActiveItemId, setActiveTopicId, setActiveCourseId, setSelectedNode } = useWorkspace();
  const progress = useProgress();

  // Opening a problem from the grid also stages its topic so the top-left
  // switcher lists every sibling problem to flip between.
  const openItem = (id: string) => {
    setActiveItemId(id);
    setActiveTopicId(null);
    setActiveCourseId(null);
    setSelectedNode(null);
  };

  const course =
    courseProp ?? (topic ? catalog.courses.find((c) => c.id === topic.courseId) : undefined);
  const flat = courseProp
    ? courseProp.topics.flatMap((t) => t.items).filter((i) => i.pluginId)
    : (topic?.items ?? []);
  const heading = courseProp?.title ?? topic?.title ?? '';
  const blurb = courseProp?.summary ?? topic?.summary;
  const total = flat.length;
  const mastered = flat.filter((it) => statFor(progress, it.id).mastered).length;
  const easy = flat.filter((it) => it.difficulty === 'Easy').length;
  const med = flat.filter((it) => it.difficulty === 'Medium').length;
  const hard = flat.filter((it) => it.difficulty === 'Hard').length;

  const Icon = courseIcon(course?.icon);
  const gridStyle = {
    backgroundImage:
      'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
    backgroundSize: '16px 16px',
  } as const;

  const renderTile = (item: Item, i: number) => {
    const isMastered = statFor(progress, item.id).mastered;
    const railColor = RAIL[item.difficulty ?? 'unrated'];
    const glyph = glyphFor(item);
    const delay = `${Math.min(i, 14) * 24}ms`;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => openItem(item.id)}
        aria-label={`Open ${item.title}, ${item.difficulty ?? 'unrated'}, ${item.status}${isMastered ? ', mastered' : ''}`}
        style={{ animationDelay: delay }}
        className={cn(
          'bp-note group relative flex min-h-[168px] flex-col items-center overflow-hidden rounded-lg border border-edge bg-panel pt-[3px] text-center transition-all hover:border-accent/60 hover:bg-panel2 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
          isMastered && 'border-good/40',
        )}
      >
        {/* difficulty foil rail */}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: railColor }} />
        {/* mastered foil sheen + trophy stamp */}
        {isMastered && (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-[var(--accent-bg)] to-transparent opacity-50"
            />
            <Trophy className="absolute right-2 top-2.5 h-3.5 w-3.5 text-good" aria-hidden />
          </>
        )}
        {/* registration ticks */}
        <span aria-hidden className="pointer-events-none absolute left-1.5 top-2 h-2 w-2 border-l border-t border-edge2 opacity-60" />
        <span aria-hidden className="pointer-events-none absolute bottom-1.5 right-1.5 h-2 w-2 border-b border-r border-edge2 opacity-60" />

        <div className="relative flex flex-1 flex-col items-center justify-center px-3 pb-3 pt-4">
          {/* mnemonic glyph */}
          <div className="relative grid flex-1 place-items-center">
            <span aria-hidden className="pointer-events-none absolute inset-1 opacity-[0.1]" style={{ ...gridStyle, backgroundSize: '10px 10px' }} />
            <svg
              viewBox="0 0 48 48"
              className="relative h-[60px] w-[60px] text-ink2 transition-all duration-200 group-hover:scale-110 group-hover:text-accent group-hover:drop-shadow-[0_0_8px_var(--accent-bg)]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              dangerouslySetInnerHTML={{ __html: glyph }}
            />
          </div>

          <div className={cn('mt-2 line-clamp-2 font-medium leading-snug text-ink2 group-hover:text-ink', chromeText.base)}>
            {item.title}
          </div>
          {(() => {
            const st = statFor(progress, item.id);
            const pct = st.attempts > 0 ? Math.round((st.correct / st.attempts) * 100) : 0;
            return st.attempts > 0 ? (
              <div className="mt-1.5 w-full px-1">
                <Meter value={st.correct} max={st.attempts} tone={isMastered ? 'good' : 'default'} height={4} />
                <div className="mt-0.5">
                  <Pill>{pct}% · {st.attempts} tries</Pill>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      </button>
    );
  };

  return (
    <div className="relative h-full overflow-auto p-2 sm:p-3">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.15]" style={gridStyle} />

      <div className="relative">
        {/* title block */}
        <div className="relative mb-3 flex items-center gap-2 overflow-hidden rounded-lg border border-edge bg-panel px-3 py-2">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-lg opacity-[0.3] [mask-image:radial-gradient(120%_120%_at_0_0,black,transparent)]"
            style={gridStyle}
          />
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md border border-edge2 bg-panel2 text-accent">
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div className="relative min-w-0 flex-1">
            <Label className="font-mono tracking-[0.12em]">
              {course ? `${course.title} · ` : ''}{total} {total === 1 ? 'PROBLEM' : 'PROBLEMS'}
            </Label>
            <h2 className={cn('truncate font-medium text-ink', chromeText.base)}>{heading}</h2>
            {blurb && <p className={cn('mt-0.5 line-clamp-1 text-ink2', chromeText.tight)}>{blurb}</p>}
          </div>
          {total > 0 && (
            <div className="relative ml-auto flex shrink-0 items-center gap-2">
              <div className="flex flex-col items-end gap-1">
                <div className="w-20">
                  <Meter value={mastered} max={total} tone="good" height={6} />
                </div>
                <span className={cn('font-mono tabular-nums text-ink3', chromeText.sm)}>
                  {mastered}/{total} mastered
                </span>
              </div>
              <div className="hidden items-center gap-1 sm:flex">
                {easy > 0 && <Chip tone={difficultyTone('Easy')} mono className={cn('!px-2 !py-0.5', chromeText.sm)}>E·{easy}</Chip>}
                {med > 0 && <Chip tone={difficultyTone('Medium')} mono className={cn('!px-2 !py-0.5', chromeText.sm)}>M·{med}</Chip>}
                {hard > 0 && <Chip tone={difficultyTone('Hard')} mono className={cn('!px-2 !py-0.5', chromeText.sm)}>H·{hard}</Chip>}
              </div>
            </div>
          )}
        </div>

        {/* tiles */}
        {total === 0 ? (
          <div className="grid h-[60vh] place-items-center">
            <EmptyState
              icon={<Boxes className="h-4 w-4" />}
              title="No problems on this sheet yet"
              hint="Items added to this category will appear here as schematic tiles."
            />
          </div>
        ) : (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))' }}>
            {flat.map(renderTile)}
          </div>
        )}
      </div>
    </div>
  );
}
