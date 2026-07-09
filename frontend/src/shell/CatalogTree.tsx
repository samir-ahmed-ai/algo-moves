import { useEffect, useMemo, useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import {
  catalog,
  getCategoriesForTrack,
  getItemsForCategory,
  getTracks,
  type TrackId,
} from '../content';
import { useWorkspace } from '@/store/workspace';
import { cn } from '@/lib/utils/cn';
import { chromeText } from './chromeUi';
import { courseIcon } from './courseIcon';
import { matchesQuery } from '@/lib/utils/searchPredicate';

export function CatalogTree({ searchQuery = '' }: { searchQuery?: string }) {
  const {
    activeItemId,
    activeCategoryId,
    activeTrackId,
    setActiveCategoryId,
    setActiveTrackId,
    setProblemFocused,
  } = useWorkspace();

  const openCategoryId =
    activeCategoryId ??
    (activeItemId
      ? (() => {
          for (const track of getTracks()) {
            for (const cat of getCategoriesForTrack(track.id)) {
              if (getItemsForCategory(cat.id, catalog).some((i) => i.id === activeItemId))
                return cat.id;
            }
          }
          return undefined;
        })()
      : undefined);

  const openTrackId: TrackId | undefined =
    activeTrackId ??
    (openCategoryId
      ? getTracks().find((t) => t.categoryIds.includes(openCategoryId))?.id
      : undefined);

  const [expandedTrackId, setExpandedTrackId] = useState<TrackId | ''>(openTrackId ?? '');

  useEffect(() => {
    if (openTrackId) setExpandedTrackId(openTrackId);
  }, [openTrackId]);

  const searching = !!searchQuery.trim();

  const filteredTracks = useMemo(() => {
    const tracks = getTracks();
    if (!searching) return tracks;
    return tracks
      .map((track) => {
        const trackMatch = matchesQuery(searchQuery, track.title, track.summary);
        const categories = getCategoriesForTrack(track.id).filter(
          (cat) =>
            trackMatch ||
            matchesQuery(searchQuery, cat.title, cat.summary) ||
            getItemsForCategory(cat.id, catalog).some((it) => matchesQuery(searchQuery, it.title)),
        );
        return categories.length ? { ...track, categories } : null;
      })
      .filter((t): t is NonNullable<typeof t> => t != null);
  }, [searchQuery, searching]);

  const matchingTrackIds = filteredTracks.map((t) => t.id);

  const trackItems = filteredTracks.map((track) => {
    const categories = searching
      ? ((track as { categories?: ReturnType<typeof getCategoriesForTrack> }).categories ??
        getCategoriesForTrack(track.id))
      : getCategoriesForTrack(track.id);
    const Icon = courseIcon(track.icon);

    return (
      <Accordion.Item
        key={track.id}
        value={track.id}
        className="catalog-tree__track border-b border-edge/70 last:border-0"
      >
        <Accordion.Header className="flex">
          <Accordion.Trigger className="catalog-tree__track-trigger group/row mx-1 flex min-h-[var(--row)] w-[calc(100%-0.5rem)] items-center gap-1.5 rounded-2xl pr-2 text-left transition-colors hover:bg-panel2">
            <span className="catalog-tree__chevron grid h-6 w-5 shrink-0 place-items-center text-ink3">
              <ChevronRight className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/row:rotate-90" />
            </span>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-xl bg-panel text-ink2 shadow-theme-sm">
              <Icon className="catalog-tree__track-icon h-3.5 w-3.5 opacity-80" />
            </span>
            <span
              className={cn(
                'catalog-tree__track-title min-w-0 flex-1 truncate font-medium text-ink2 group-hover/row:text-ink',
                chromeText.sm,
              )}
            >
              {track.title}
            </span>
            <span
              className={cn(
                'catalog-tree__count shrink-0 font-mono tabular-nums text-ink3',
                chromeText.xs,
              )}
            >
              {categories.length}
            </span>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="catalog-tree__categories pb-1">
            {categories.map((cat) => {
              const active = cat.id === openCategoryId;
              const count = getItemsForCategory(cat.id, catalog).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveTrackId(track.id);
                    setActiveCategoryId(cat.id);
                    setProblemFocused(false);
                  }}
                  title={`Open the ${cat.title} grid`}
                  className={cn(
                    'group/topic mx-1 flex min-h-[var(--row)] w-[calc(100%-0.5rem)] items-center gap-2 rounded-2xl py-0 pl-[26px] pr-[var(--hpad)] text-left transition-colors',
                    'catalog-tree__category',
                    active
                      ? 'catalog-tree__category--active bg-accentbg text-accent'
                      : 'text-ink2 hover:bg-panel2 hover:text-ink',
                  )}
                >
                  <span className={cn('min-w-0 flex-1 truncate', chromeText.sm)}>{cat.title}</span>
                  <span
                    className={cn(
                      'catalog-tree__category-count shrink-0 font-mono tabular-nums text-ink3',
                      chromeText.xs,
                    )}
                  >
                    {count}
                  </span>
                  <LayoutGrid
                    className={cn(
                      'h-3 w-3 shrink-0 transition-opacity',
                      active ? 'opacity-100 text-accent' : 'opacity-0 group-hover/topic:opacity-60',
                    )}
                  />
                </button>
              );
            })}
          </div>
        </Accordion.Content>
      </Accordion.Item>
    );
  });

  if (searching && filteredTracks.length === 0) {
    return (
      <div
        className={cn(
          'mx-2 my-2 rounded-2xl border border-edge bg-panel/70 px-[var(--hpad)] py-4 text-center leading-snug text-ink3 shadow-theme-sm',
          chromeText.sm,
        )}
      >
        No matching categories.
      </div>
    );
  }

  if (searching) {
    return (
      <Accordion.Root
        type="multiple"
        value={matchingTrackIds}
        className="catalog-tree catalog-tree--searching py-1"
      >
        {trackItems}
      </Accordion.Root>
    );
  }

  return (
    <nav aria-label="Catalog">
      <Accordion.Root
        type="single"
        collapsible
        value={expandedTrackId}
        onValueChange={(v) => setExpandedTrackId(v as TrackId | '')}
        className="catalog-tree py-1"
      >
        {trackItems}
      </Accordion.Root>
    </nav>
  );
}
