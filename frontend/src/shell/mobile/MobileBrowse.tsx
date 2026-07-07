import { type MouseEvent, useMemo, useState } from 'react';
import { BookmarkPlus, Check, CheckCircle2, Play, Search, X } from 'lucide-react';
import {
  catalog,
  getItemsForCategory,
  searchBrowse,
  topicForCategory,
  type Item,
  type Topic,
} from '../../content';
import { useProgress, statFor } from '@/store/persistence';
import { useWorkspace } from '@/store/workspace';
import { Chip, difficultyTone } from '@/design/components';
import { CourseTree } from '../browse/CourseTree';
import { ProblemGlyph } from './scenes/ProblemGlyph';
import { loadMobileSession } from './mobileSession';
import { usePlan } from '@/shell/plans/PlanContext';
import { cn } from '@/lib/utils/cn';

export function MobileBrowse({
  onPick,
}: {
  onPick: (topic: Topic, startItemId?: string, initialPIdx?: number, initialCIdx?: number) => void;
}) {
  const progress = useProgress();
  const { isBuilding, hasItem, addItem, removeItem } = usePlan();
  const { activeTrackId, activeCategoryId } = useWorkspace();
  const [query, setQuery] = useState('');

  const resume = loadMobileSession();
  const resumeCategoryId = resume?.topicId?.startsWith('browse-')
    ? resume.topicId.slice('browse-'.length)
    : undefined;
  const resumeTopic = resumeCategoryId ? topicForCategory(resumeCategoryId, catalog) : undefined;

  const allItems = useMemo(() => catalog.items.filter((i) => i.pluginId), []);
  const totals = useMemo(() => {
    const mastered = allItems.filter((i) => statFor(progress, i.id).mastered).length;
    return { mastered, total: allItems.length };
  }, [allItems, progress]);

  const q = query.trim().toLowerCase();
  const searchResults = useMemo(() => (q ? searchBrowse(q, catalog) : null), [q]);
  const initialOpen = {
    ...(activeTrackId ? { trackId: activeTrackId } : {}),
    ...(activeCategoryId ? { categoryId: activeCategoryId } : {}),
  };

  const startDeck = (categoryId: string, startItemId?: string) => {
    const topic = topicForCategory(categoryId, catalog);
    if (!topic) return;
    onPick(topic, startItemId);
  };

  const renderProblemRow = (it: Item, categoryId: string) => {
    const done = statFor(progress, it.id).mastered;
    const inPlan = isBuilding && hasItem(it.id);
    const handlePlanToggle = (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (inPlan) removeItem(it.id);
      else addItem(it.id);
    };
    return (
      <li
        key={it.id}
        className={cn(
          'relative border-b border-edge last:border-b-0 transition-colors',
          isBuilding && inPlan && 'bg-accentbg/30',
        )}
      >
        {isBuilding && (
          <button
            type="button"
            onClick={handlePlanToggle}
            aria-label={inPlan ? `Remove ${it.title} from plan` : `Add ${it.title} to plan`}
            className={cn(
              'absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full border shadow-theme-sm transition-all active:scale-95',
              inPlan
                ? 'border-accent/60 bg-accent text-[var(--accent-contrast)]'
                : 'border-edge bg-panel text-ink3 active:bg-panel2',
            )}
          >
            {inPlan ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <BookmarkPlus className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => startDeck(categoryId, it.id)}
          className={cn(
            'flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors active:bg-panel2',
            isBuilding && 'pr-11',
          )}
        >
          <ProblemGlyph item={it} className="mt-0.5 h-7 w-7 shrink-0 text-ink2" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[length:var(--fs)] font-medium text-ink">
              {it.title}
            </span>
            {it.summary && (
              <span className="mt-0.5 block line-clamp-2 text-[length:var(--fs-xs)] leading-snug text-ink3">
                {it.summary}
              </span>
            )}
          </span>
          {it.difficulty && (
            <Chip
              tone={difficultyTone(it.difficulty)}
              mono
              className="!px-1.5 !py-0 shrink-0 text-[length:var(--fs-2xs)]"
            >
              {it.difficulty}
            </Chip>
          )}
          {done && <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" />}
        </button>
      </li>
    );
  };

  const planToggleAccessory = (it: Item) => {
    const inPlan = hasItem(it.id);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (inPlan) removeItem(it.id);
          else addItem(it.id);
        }}
        aria-label={inPlan ? `Remove ${it.title} from plan` : `Add ${it.title} to plan`}
        className={cn(
          'grid h-7 w-7 shrink-0 place-items-center rounded-full border shadow-theme-sm transition-all active:scale-95',
          inPlan
            ? 'border-accent/60 bg-accent text-[var(--accent-contrast)]'
            : 'border-edge bg-panel text-ink3 active:bg-panel2',
        )}
      >
        {inPlan ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <BookmarkPlus className="h-3.5 w-3.5" />
        )}
      </button>
    );
  };

  return (
    <div className="ws-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-10 pt-3">
      {/* hero */}
      <div className="relative overflow-hidden rounded-3xl border border-edge bg-panel/80 p-4 shadow-theme-md">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-55"
          style={{
            background:
              'linear-gradient(135deg, var(--accent-bg), transparent 58%), repeating-linear-gradient(90deg, color-mix(in srgb, var(--edge) 28%, transparent) 0 1px, transparent 1px 28px)',
          }}
        />
        <div className="relative">
          <p className="mb-1 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-accent">
            Mobile drill deck
          </p>
          <h1 className="text-[20px] font-semibold leading-tight text-ink">Swipe to master</h1>
          <p className="mt-1 text-[length:var(--fs-sm)] text-ink2">
            Expand a course, then a subtopic — animate, quiz, rebuild.
          </p>
          {resumeTopic && resumeCategoryId && (
            <button
              type="button"
              onClick={() => startDeck(resumeCategoryId, resume!.itemId)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[length:var(--fs)] font-semibold text-[var(--accent-contrast)] shadow-theme-sm"
            >
              <Play className="h-4 w-4" />
              Continue {resumeTopic.title}
              <span className="text-[length:var(--fs-xs)] font-normal opacity-90">
                · problem {(resume!.pIdx ?? 0) + 1}
              </span>
            </button>
          )}
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full border border-edge bg-panel2/80">
              <div
                className="h-full rounded-full bg-good transition-[width] duration-700"
                style={{ width: `${totals.total ? (totals.mastered / totals.total) * 100 : 0}%` }}
              />
            </div>
            <span className="shrink-0 text-[length:var(--fs-xs)] font-medium tabular-nums text-ink2">
              {totals.mastered}/{totals.total} mastered
            </span>
          </div>
        </div>
      </div>

      {/* search */}
      <div className="relative mt-3">
        <label htmlFor="mobile-browse-search" className="sr-only">
          Search problems or categories
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
        <input
          id="mobile-browse-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search problems or categories…"
          className="w-full rounded-full border border-edge bg-panel/80 py-2.5 pl-9 pr-10 text-[length:var(--fs)] text-ink shadow-theme-sm outline-none placeholder:text-ink3 focus:border-accent"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-ink3 transition-colors active:bg-panel2 active:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {q && searchResults ? (
        <div className="mt-4 flex flex-col gap-4">
          {searchResults.categories.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-[length:var(--fs-xs)] font-semibold uppercase tracking-wide text-ink3">
                Categories
              </h2>
              <div className="flex flex-col gap-2">
                {searchResults.categories.map((cat) => {
                  const count = getItemsForCategory(cat.id, catalog).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => startDeck(cat.id)}
                      className="flex items-center justify-between gap-2 rounded-lg border border-edge bg-panel/80 px-3 py-2.5 text-left text-[length:var(--fs)] font-medium text-ink shadow-[var(--shadow-sm)] active:bg-panel2"
                    >
                      <span className="truncate">{cat.title}</span>
                      <span className="shrink-0 text-[length:var(--fs-xs)] text-ink3">{count}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          {searchResults.items.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-[length:var(--fs-xs)] font-semibold uppercase tracking-wide text-ink3">
                Problems
              </h2>
              <ul className="overflow-hidden rounded-2xl border border-edge bg-panel/80 shadow-theme-sm">
                {searchResults.items.slice(0, 20).map((it) => {
                  const cat = searchResults.categories.find((c) =>
                    getItemsForCategory(c.id, catalog).some((i) => i.id === it.id),
                  );
                  return cat ? renderProblemRow(it, cat.id) : null;
                })}
              </ul>
            </section>
          )}
          {searchResults.categories.length === 0 && searchResults.items.length === 0 && (
            <p className="px-1 py-8 text-center text-[length:var(--fs)] text-ink3">
              No matches for “{query}”.
            </p>
          )}
        </div>
      ) : (
        <CourseTree
          className="mt-4"
          storageKey="algo.mobile.courseTree"
          showBulkToggle
          showItemSummary
          initialOpen={initialOpen}
          onProblem={(item, categoryId) => startDeck(categoryId, item.id)}
          subtopicAccessory={(categoryId) => (
            <button
              type="button"
              onClick={() => startDeck(categoryId)}
              aria-label="Start this subtopic"
              title="Start this subtopic"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[length:var(--fs-xs)] font-semibold text-[var(--accent-contrast)] shadow-theme-sm active:opacity-90"
            >
              <Play className="h-3 w-3" />
              Start
            </button>
          )}
          {...(isBuilding ? { problemAccessory: planToggleAccessory } : {})}
        />
      )}
    </div>
  );
}
