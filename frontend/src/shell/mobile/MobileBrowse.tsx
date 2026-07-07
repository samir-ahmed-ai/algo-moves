import { useMemo, useState } from 'react';
import { BookmarkPlus, Check, CheckCircle2, Play, Search } from 'lucide-react';
import {
  catalog,
  getCategoryById,
  getItemsForCategory,
  getTrackById,
  searchBrowse,
  topicForCategory,
  type Item,
  type Topic,
  type TrackId,
} from '../../content';
import { useProgress, statFor } from '@/store/persistence';
import { useWorkspace } from '@/store/workspace';
import { Chip, difficultyTone } from '@/design/components';
import { TrackGrid } from '../browse/TrackGrid';
import { CategoryGrid } from '../browse/CategoryGrid';
import { BrowseBreadcrumb } from '../browse/BrowseBreadcrumb';
import { ProblemGlyph } from './scenes/ProblemGlyph';
import { loadMobileSession } from './mobileSession';
import { writeMobileHash } from '@/lib/navigation';
import { usePlan } from '@/shell/plans/PlanContext';
import { cn } from '@/lib/utils/cn';

export function MobileBrowse({
  onPick,
}: {
  onPick: (topic: Topic, startItemId?: string, initialPIdx?: number, initialCIdx?: number) => void;
}) {
  const progress = useProgress();
  const { isBuilding, hasItem, addItem, removeItem } = usePlan();
  const { activeTrackId, setActiveTrackId, activeCategoryId, setActiveCategoryId } = useWorkspace();
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

  const categoryItems = useMemo(
    () => (activeCategoryId ? getItemsForCategory(activeCategoryId, catalog) : []),
    [activeCategoryId],
  );

  const pickTrack = (trackId: TrackId) => {
    setActiveTrackId(trackId);
    setActiveCategoryId(null);
    writeMobileHash({ trackId }, { replace: false });
  };

  const pickCategory = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    writeMobileHash({ trackId: activeTrackId ?? 'interview-prep', categoryId }, { replace: false });
  };

  const backFromCategory = () => {
    setActiveCategoryId(null);
    writeMobileHash(activeTrackId ? { trackId: activeTrackId } : null, { replace: true });
  };

  const backFromTrack = () => {
    setActiveTrackId(null);
    setActiveCategoryId(null);
    writeMobileHash(null, { replace: true });
  };

  const startDeck = (categoryId: string, startItemId?: string) => {
    const topic = topicForCategory(categoryId, catalog);
    if (!topic) return;
    onPick(topic, startItemId);
  };

  const renderProblemRow = (it: Item, categoryId: string) => {
    const done = statFor(progress, it.id).mastered;
    const inPlan = isBuilding && hasItem(it.id);
    const handlePlanToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (inPlan) removeItem(it.id);
      else addItem(it.id);
    };
    return (
      <li key={it.id}>
        <button
          type="button"
          onClick={() => startDeck(categoryId, it.id)}
          className={cn(
            'relative flex w-full items-start gap-3 border-b border-edge px-3 py-2.5 text-left last:border-b-0 transition-colors active:bg-panel2',
            isBuilding && inPlan && 'bg-accentbg/30',
          )}
        >
          {isBuilding && (
            <button
              type="button"
              onClick={handlePlanToggle}
              aria-label={inPlan ? `Remove ${it.title} from plan` : `Add ${it.title} to plan`}
              className={cn(
                'absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-lg border transition-colors',
                inPlan
                  ? 'border-accent/60 bg-accent text-white'
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

  return (
    <div className="ws-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-10">
      {/* hero */}
      <div className="relative mt-1 overflow-hidden rounded-2xl border border-edge bg-panel p-4">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background: 'radial-gradient(70% 90% at 90% 0%, var(--accent-bg) 0%, transparent 60%)',
          }}
        />
        <div className="relative">
          <h1 className="text-[20px] font-semibold leading-tight tracking-tight text-ink">
            Swipe to master
          </h1>
          <p className="mt-1 text-[length:var(--fs-sm)] text-ink2">
            Pick a track, then a category — animate, quiz, rebuild.
          </p>
          {resumeTopic && resumeCategoryId && !activeCategoryId && (
            <button
              type="button"
              onClick={() => startDeck(resumeCategoryId, resume!.itemId)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[length:var(--fs)] font-semibold text-white"
            >
              <Play className="h-4 w-4" />
              Continue {resumeTopic.title}
              <span className="text-[length:var(--fs-xs)] font-normal opacity-90">
                · problem {(resume!.pIdx ?? 0) + 1}
              </span>
            </button>
          )}
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel2">
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

      {/* search — only on root / track level */}
      {!activeCategoryId && (
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problems or categories…"
            className="w-full rounded-xl border border-edge bg-panel py-2.5 pl-9 pr-3 text-[length:var(--fs)] text-ink outline-none placeholder:text-ink3 focus:border-accent"
          />
        </div>
      )}

      {/* level 3: flat problem list */}
      {activeCategoryId ? (
        <div className="mt-4">
          <BrowseBreadcrumb
            trackId={activeTrackId}
            categoryId={activeCategoryId}
            onBack={backFromCategory}
          />
          {(() => {
            const cat = getCategoryById(activeCategoryId);
            const items = categoryItems;
            const mastered = items.filter((i) => statFor(progress, i.id).mastered).length;
            return (
              <>
                <div className="mb-3 flex items-center justify-between gap-2 px-1">
                  <div>
                    <h2 className="text-[16px] font-semibold text-ink">{cat?.title}</h2>
                    <p className="text-[length:var(--fs-xs)] text-ink3">
                      {items.length} problems · {mastered} mastered
                    </p>
                  </div>
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => startDeck(activeCategoryId)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-[length:var(--fs-sm)] font-semibold text-white"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start
                    </button>
                  )}
                </div>
                <ul className="overflow-hidden rounded-2xl border border-edge bg-panel">
                  {items.map((it) => renderProblemRow(it, activeCategoryId))}
                </ul>
              </>
            );
          })()}
        </div>
      ) : activeTrackId ? (
        /* level 2: category grid */
        <div className="mt-4">
          <BrowseBreadcrumb trackId={activeTrackId} onBack={backFromTrack} />
          <div className="mb-3 px-1">
            <h2 className="text-[16px] font-semibold text-ink">
              {getTrackById(activeTrackId)?.title}
            </h2>
            <p className="text-[length:var(--fs-xs)] text-ink3">
              {getTrackById(activeTrackId)?.summary}
            </p>
          </div>
          {q && searchResults ? (
            <div className="flex flex-col gap-2">
              {searchResults.categories.map((cat) => {
                const count = getItemsForCategory(cat.id, catalog).length;
                if (count === 0) return null;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => pickCategory(cat.id)}
                    className="rounded-xl border border-edge bg-panel px-3 py-2.5 text-left text-[length:var(--fs)] font-medium text-ink active:bg-panel2"
                  >
                    {cat.title}
                    <span className="ml-2 text-[length:var(--fs-xs)] text-ink3">{count}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <CategoryGrid trackId={activeTrackId} onPick={pickCategory} />
          )}
        </div>
      ) : (
        /* level 1: track grid */
        <div className="mt-4">
          {q && searchResults ? (
            <div className="flex flex-col gap-4">
              {searchResults.categories.length > 0 && (
                <section>
                  <h2 className="mb-2 px-1 text-[length:var(--fs-xs)] font-semibold uppercase tracking-wide text-ink3">
                    Categories
                  </h2>
                  <div className="flex flex-col gap-2">
                    {searchResults.categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          const track = getTrackById('interview-prep');
                          if (track) setActiveTrackId('interview-prep');
                          pickCategory(cat.id);
                        }}
                        className="rounded-xl border border-edge bg-panel px-3 py-2.5 text-left text-[length:var(--fs)] font-medium text-ink active:bg-panel2"
                      >
                        {cat.title}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {searchResults.items.length > 0 && (
                <section>
                  <h2 className="mb-2 px-1 text-[length:var(--fs-xs)] font-semibold uppercase tracking-wide text-ink3">
                    Problems
                  </h2>
                  <ul className="overflow-hidden rounded-2xl border border-edge bg-panel">
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
            <TrackGrid onPick={pickTrack} />
          )}
        </div>
      )}
    </div>
  );
}
