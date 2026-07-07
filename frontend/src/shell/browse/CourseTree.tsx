import { useCallback, useMemo, useState, type ReactNode } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { Check, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import {
  catalog,
  getCategoriesForTrack,
  getItemsForCategory,
  getTracks,
  type Item,
} from '../../content';
import { useProgress, statFor, readStorageJson, writeStorageJson } from '@/store/persistence';
import { Chip, difficultyTone, Meter } from '@/design/components';
import { cn } from '@/lib/utils/cn';
import { courseIcon } from '../courseIcon';
import { chromeText } from '../chromeUi';
import { ProblemGlyph } from '../mobile/scenes/ProblemGlyph';
import { trackColor } from './trackColors';

export interface CourseTreeProps {
  /** Click handler for a problem row. */
  onProblem: (item: Item, categoryId: string) => void;
  /** Optional trailing control per problem row (e.g. visualize / plan toggle). */
  problemAccessory?: (item: Item, categoryId: string) => ReactNode;
  /** Optional trailing control on a subtopic header (e.g. play deck). */
  subtopicAccessory?: (categoryId: string) => ReactNode;
  /** Optional trailing control on a course header (e.g. open track grid). */
  trackAccessory?: (trackId: string) => ReactNode;
  /** Show a clamped problem summary under the title (better on phones). */
  showItemSummary?: boolean;
  /** Persist open course/subtopic ids under this localStorage key. */
  storageKey?: string;
  /** Show the expand-all / collapse-all toolbar. */
  showBulkToggle?: boolean;
  /** Course/category to open on first mount (e.g. from a deep link). */
  initialOpen?: { trackId?: string | null; categoryId?: string | null };
  className?: string;
}

interface OpenState {
  tracks: string[];
  cats: string[];
}

const EMPTY: OpenState = { tracks: [], cats: [] };

function isOpenState(v: unknown): v is OpenState {
  return (
    typeof v === 'object' &&
    v != null &&
    Array.isArray((v as OpenState).tracks) &&
    Array.isArray((v as OpenState).cats)
  );
}

/** Content courses only — the `interview-prep` aggregator duplicates everything. */
function contentTracks() {
  return getTracks().filter((t) => t.id !== 'interview-prep');
}

export function CourseTree({
  onProblem,
  problemAccessory,
  subtopicAccessory,
  trackAccessory,
  showItemSummary = false,
  storageKey,
  showBulkToggle = false,
  initialOpen,
  className,
}: CourseTreeProps) {
  const progress = useProgress();
  const tracks = useMemo(() => contentTracks(), []);

  const [open, setOpen] = useState<OpenState>(() => {
    const stored = storageKey ? readStorageJson<OpenState>(storageKey, EMPTY, isOpenState) : EMPTY;
    const tracks = [...stored.tracks];
    const cats = [...stored.cats];
    if (initialOpen?.trackId && !tracks.includes(initialOpen.trackId))
      tracks.push(initialOpen.trackId);
    if (initialOpen?.categoryId && !cats.includes(initialOpen.categoryId))
      cats.push(initialOpen.categoryId);
    return { tracks, cats };
  });

  const persist = useCallback(
    (next: OpenState) => {
      setOpen(next);
      if (storageKey) writeStorageJson(storageKey, next);
    },
    [storageKey],
  );

  const setOpenTracks = useCallback(
    (ids: string[]) => persist({ tracks: ids, cats: open.cats }),
    [open.cats, persist],
  );
  const setOpenCats = useCallback(
    (ids: string[]) => persist({ tracks: open.tracks, cats: ids }),
    [open.tracks, persist],
  );

  const isMastered = useCallback((id: string) => statFor(progress, id).mastered, [progress]);

  const visibleTracks = useMemo(
    () =>
      tracks.filter(
        (t) =>
          getCategoriesForTrack(t.id).filter(
            (cat) => getItemsForCategory(cat.id, catalog).length > 0,
          ).length > 0,
      ),
    [tracks],
  );

  const allOpen = open.tracks.length >= visibleTracks.length && visibleTracks.length > 0;

  return (
    <div className={cn('course-tree flex flex-col gap-2', className)}>
      {showBulkToggle && (
        <div className="course-tree__toolbar flex justify-end">
          <button
            type="button"
            onClick={() =>
              allOpen ? setOpenTracks([]) : setOpenTracks(visibleTracks.map((t) => t.id))
            }
            className={cn(
              'course-tree__bulk-toggle inline-flex items-center gap-1.5 rounded-md border border-edge bg-panel/60 px-2 py-1 text-ink3 transition-colors hover:bg-panel2 hover:text-ink',
              chromeText.xs,
            )}
          >
            {allOpen ? (
              <ChevronsDownUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            )}
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      )}

      <Accordion.Root
        type="multiple"
        value={open.tracks}
        onValueChange={setOpenTracks}
        className="course-tree__tracks flex flex-col gap-2"
      >
        {visibleTracks.map((track) => {
          const categories = getCategoriesForTrack(track.id).filter(
            (cat) => getItemsForCategory(cat.id, catalog).length > 0,
          );
          const trackItems = categories.flatMap((cat) => getItemsForCategory(cat.id, catalog));
          const trackTotal = trackItems.length;
          const trackMastered = trackItems.filter((i) => isMastered(i.id)).length;
          const color = trackColor(track.id);
          const Icon = courseIcon(track.icon);

          return (
            <Accordion.Item
              key={track.id}
              value={track.id}
              className="course-tree__track overflow-hidden rounded-2xl border border-edge bg-panel/70 shadow-theme-sm transition-shadow hover:shadow-theme-md"
            >
              <Accordion.Header className="flex items-center">
                <Accordion.Trigger
                  className="course-tree__track-trigger group/course flex min-w-0 flex-1 items-center gap-3 border-l-[3px] px-3 py-2.5 text-left transition-colors hover:bg-panel2"
                  style={{ borderLeftColor: color.c1 }}
                >
                  <ChevronRight className="course-tree__chevron h-3.5 w-3.5 shrink-0 text-ink3 transition-transform duration-200 group-data-[state=open]/course:rotate-90" />
                  <span
                    className="course-tree__track-icon grid h-8 w-8 shrink-0 place-items-center rounded-2xl text-white shadow-theme-sm [&>svg]:h-4 [&>svg]:w-4"
                    style={{ background: `linear-gradient(135deg, ${color.c1}, ${color.c2})` }}
                  >
                    <Icon strokeWidth={1.6} />
                  </span>
                  <span className="course-tree__track-copy min-w-0 flex-1">
                    <span className="course-tree__track-title block truncate font-semibold text-ink">
                      {track.title}
                    </span>
                    <span
                      className={cn(
                        'course-tree__track-summary block truncate text-ink3',
                        chromeText.sm,
                      )}
                    >
                      {track.summary}
                    </span>
                  </span>
                  <span className="course-tree__track-meter hidden w-24 shrink-0 sm:block">
                    <Meter
                      value={trackMastered}
                      max={Math.max(trackTotal, 1)}
                      tone="good"
                      height={4}
                    />
                  </span>
                  <span
                    className={cn(
                      'course-tree__track-count shrink-0 font-mono tabular-nums text-ink3',
                      chromeText.xs,
                    )}
                  >
                    {trackMastered}/{trackTotal}
                  </span>
                </Accordion.Trigger>
                {trackAccessory && (
                  <span
                    className="course-tree__track-accessory shrink-0 pr-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {trackAccessory(track.id)}
                  </span>
                )}
              </Accordion.Header>

              <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div
                  className="course-tree__track-body border-l-[3px] pl-1"
                  style={{
                    borderLeftColor: `color-mix(in srgb, ${color.c1} 40%, transparent)`,
                  }}
                >
                  <Accordion.Root type="multiple" value={open.cats} onValueChange={setOpenCats}>
                    {categories.map((cat) => {
                      const items = getItemsForCategory(cat.id, catalog);
                      const mastered = items.filter((i) => isMastered(i.id)).length;

                      return (
                        <Accordion.Item
                          key={cat.id}
                          value={cat.id}
                          className="course-tree__category border-b border-edge/60 last:border-0"
                        >
                          <Accordion.Header className="flex items-center">
                            <Accordion.Trigger className="course-tree__category-trigger group/sub flex min-w-0 flex-1 items-center gap-2 rounded-r-2xl py-2 pl-2 pr-2 text-left transition-colors hover:bg-panel2">
                              <ChevronRight className="course-tree__chevron h-3 w-3 shrink-0 text-ink3 transition-transform duration-200 group-data-[state=open]/sub:rotate-90" />
                              <span
                                className={cn(
                                  'course-tree__category-title min-w-0 flex-1 truncate font-medium text-ink2',
                                  chromeText.sm,
                                )}
                              >
                                {cat.title}
                              </span>
                              <span
                                className={cn(
                                  'course-tree__category-count shrink-0 font-mono tabular-nums text-ink3',
                                  chromeText.xs,
                                )}
                              >
                                {mastered}/{items.length}
                              </span>
                            </Accordion.Trigger>
                            {subtopicAccessory && (
                              <span className="course-tree__category-accessory shrink-0 pr-2">
                                {subtopicAccessory(cat.id)}
                              </span>
                            )}
                          </Accordion.Header>

                          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                            <ul className="course-tree__problems pb-1">
                              {items.map((it) => (
                                <ProblemRow
                                  key={it.id}
                                  item={it}
                                  categoryId={cat.id}
                                  mastered={isMastered(it.id)}
                                  showSummary={showItemSummary}
                                  onProblem={onProblem}
                                  {...(problemAccessory ? { accessory: problemAccessory } : {})}
                                />
                              ))}
                            </ul>
                          </Accordion.Content>
                        </Accordion.Item>
                      );
                    })}
                  </Accordion.Root>
                </div>
              </Accordion.Content>
            </Accordion.Item>
          );
        })}
      </Accordion.Root>
    </div>
  );
}

function ProblemRow({
  item,
  categoryId,
  mastered,
  showSummary,
  onProblem,
  accessory,
}: {
  item: Item;
  categoryId: string;
  mastered: boolean;
  showSummary: boolean;
  onProblem: (item: Item, categoryId: string) => void;
  accessory?: (item: Item, categoryId: string) => ReactNode;
}) {
  return (
    <li className="course-tree__problem group/row flex items-center gap-2 rounded-r-2xl pl-4 pr-2 transition-colors hover:bg-panel/60">
      <button
        type="button"
        onClick={() => onProblem(item, categoryId)}
        title={item.title}
        className="course-tree__problem-button flex min-w-0 flex-1 items-start gap-2.5 py-1.5 text-left"
      >
        <ProblemGlyph
          item={item}
          className="course-tree__problem-glyph mt-0.5 h-5 w-5 shrink-0 rounded-lg text-ink3"
        />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'course-tree__problem-title flex items-center gap-1.5 truncate text-ink2 group-hover/row:text-ink',
              chromeText.sm,
            )}
          >
            <span className="truncate">{item.title}</span>
            {mastered && <Check className="h-3.5 w-3.5 shrink-0 text-good" />}
          </span>
          {showSummary && item.summary && (
            <span
              className={cn(
                'course-tree__problem-summary mt-0.5 block line-clamp-2 leading-snug text-ink3',
                chromeText.xs,
              )}
            >
              {item.summary}
            </span>
          )}
        </span>
      </button>
      {item.difficulty && (
        <Chip
          tone={difficultyTone(item.difficulty)}
          mono
          className="!px-1.5 !py-0 shrink-0 text-[length:var(--fs-2xs)]"
        >
          {item.difficulty}
        </Chip>
      )}
      {accessory?.(item, categoryId)}
    </li>
  );
}
