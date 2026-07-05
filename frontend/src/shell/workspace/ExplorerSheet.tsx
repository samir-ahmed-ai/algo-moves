import { useEffect, useState, type DragEvent, type ReactNode } from 'react';
import {
  BookOpen,
  Eye,
  FileText,
  FolderOpen,
  LayoutGrid,
  Library,
  Plus,
  Search,
  Shapes,
  Star,
  Target,
  Trophy,
  Code2,
  X,
} from 'lucide-react';
import { nodeIcon, panelAccent, Label, RADIUS_SHELL, CATEGORY_ORDER, nodeCategory } from '@/shell/canvas';
import {
  catalog,
  browseBreadcrumbForItem,
  getSiblingItems,
  categoryIdForItem,
  trackForCategory,
  type ItemStatus,
} from '../../content';
import { useProgress, statFor } from '@/store/persistence';
import { useWorkspace } from '@/store/workspace';
import { cn } from '@/lib/utils/cn';
import { matchesQuery } from '@/lib/utils/searchPredicate';
import { chromeText } from '../chromeUi';
import { CatalogTree } from '../CatalogTree';
import { SidebarSection, SECTION_MAX, MobileDrawer } from '../SidebarShell';

const ESSENTIALS = new Set(['bigo', 'diff', 'watch', 'pattern', 'editor', 'notes', 'predict', 'mastery', 'hints']);

const CAT_ICON: Record<string, ReactNode> = {
  Visualize: <Eye className="h-4 w-4" />,
  Practice: <Target className="h-4 w-4" />,
  Progress: <Trophy className="h-4 w-4" />,
  Reference: <BookOpen className="h-4 w-4" />,
  Code: <Code2 className="h-4 w-4" />,
  Workspace: <FolderOpen className="h-4 w-4" />,
  Problem: <FileText className="h-4 w-4" />,
  Effects: <Shapes className="h-4 w-4" />,
  Other: <Shapes className="h-4 w-4" />,
};

const STATUS_DOT: Record<ItemStatus, string> = {
  todo: 'var(--text-3)',
  'in-progress': 'var(--edge-active)',
  done: 'var(--good)',
};

export type ExplorerFocus = 'catalog' | 'problems' | 'add' | null;

export function explorerSectionOpen(focus: ExplorerFocus, searching: boolean) {
  return {
    catalogOpen: searching || focus === 'catalog' || focus === null,
    problemsOpen: searching || focus === 'problems',
    addOpen: searching || focus === 'add',
  };
}

function AddItem({
  kind,
  title,
  dndKey,
  onAddKind,
}: {
  kind: string;
  title: string;
  dndKey: string;
  onAddKind: (kind: string) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onClick={() => onAddKind(kind)}
      onDragStart={(e: DragEvent) => {
        e.dataTransfer.setData(dndKey, kind);
        e.dataTransfer.effectAllowed = 'move';
      }}
      title={`Add ${title}`}
      aria-label={`Add ${title}`}
      className="flex w-full min-h-[var(--row)] cursor-grab items-center gap-2 rounded-md border border-transparent px-2 py-0 text-left transition-colors hover:border-edge hover:bg-panel2 active:cursor-grabbing"
    >
      <span className="grid h-[var(--node-icon,16px)] w-[var(--node-icon,16px)] shrink-0 place-items-center" style={{ color: panelAccent(kind) }}>
        {nodeIcon(kind)}
      </span>
      <span className={cn('min-w-0 flex-1 truncate text-ink2', chromeText.sm)}>{title}</span>
    </button>
  );
}

export function ExplorerSheet({
  open,
  focus,
  onClose,
}: {
  open: boolean;
  focus: ExplorerFocus;
  onClose: () => void;
}) {
  const {
    activeItemId,
    openProblem,
    setActiveTrackId,
    setActiveCategoryId,
    setProblemFocused,
    canvasAdd,
    isMobile,
  } = useWorkspace();
  const progress = useProgress();

  const [catalogOpen, setCatalogOpen] = useState(true);
  const [problemsOpen, setProblemsOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const siblingItems = getSiblingItems(activeItemId, catalog);
  const browseCrumb = browseBreadcrumbForItem(activeItemId, catalog);
  const problemsTitle = browseCrumb.category?.title ?? catalog.breadcrumb(activeItemId).topic?.title ?? 'Problems';
  const showProblems = siblingItems.length >= 2;
  const showAdd = canvasAdd != null;
  const searching = !!sidebarSearch.trim();

  useEffect(() => {
    if (!open) return;
    const next = explorerSectionOpen(focus, searching);
    setCatalogOpen(next.catalogOpen);
    setProblemsOpen(next.problemsOpen);
    setAddOpen(next.addOpen);
  }, [open, focus, searching]);

  useEffect(() => {
    if (searching) {
      setCatalogOpen(true);
      setProblemsOpen(true);
      setAddOpen(true);
    }
  }, [searching]);

  if (!open) return null;

  const addableKinds = canvasAdd?.addableKinds ?? [];
  const filteredAddable = searching
    ? addableKinds.filter((k) =>
        matchesQuery(sidebarSearch, k.title, k.id, nodeCategory(k.id)),
      )
    : addableKinds;
  const essentials = filteredAddable.filter((k) => ESSENTIALS.has(k.id));
  const catTabs = CATEGORY_ORDER.map((cat) => ({
    key: cat as string,
    icon: CAT_ICON[cat],
    items: filteredAddable.filter((k) => nodeCategory(k.id) === cat && !ESSENTIALS.has(k.id)),
  })).filter((g) => g.items.length > 0);

  const tabs = [
    ...(essentials.length ? [{ key: 'Essentials', icon: <Star className="h-3.5 w-3.5" />, items: essentials }] : []),
    ...catTabs,
  ];
  const tabIdx = Math.min(activeTab, Math.max(0, tabs.length - 1));
  const currentTab = tabs[tabIdx];

  const filteredProblems =
    showProblems && searching
      ? siblingItems.filter((it) =>
          matchesQuery(sidebarSearch, it.title, it.id, it.difficulty),
        )
      : siblingItems;

  const groupedPanelResults = searching
    ? (() => {
        const groups: { key: string; items: typeof filteredAddable }[] = [];
        const ess = filteredAddable.filter((k) => ESSENTIALS.has(k.id));
        if (ess.length) groups.push({ key: 'Essentials', items: ess });
        for (const cat of CATEGORY_ORDER) {
          const items = filteredAddable.filter(
            (k) => nodeCategory(k.id) === cat && !ESSENTIALS.has(k.id),
          );
          if (items.length) groups.push({ key: cat, items });
        }
        return groups;
      })()
    : null;

  const switchTo = (id: string) => {
    if (id === activeItemId) return;
    openProblem(id);
  };

  const panel = (
    <div
      className={cn(
        'flex max-h-[70vh] w-[280px] max-w-[86vw] flex-col overflow-hidden bg-panel text-ink shadow-[var(--shadow-lg)]',
        isMobile ? 'h-full max-h-none w-full max-w-none' : cn(RADIUS_SHELL, 'border border-edge'),
      )}
      role="dialog"
      aria-label="Explorer"
    >
      <header className="flex shrink-0 items-center gap-1.5 border-b border-edge px-[var(--hpad)] py-1">
        <span className={cn('min-w-0 flex-1 truncate font-semibold leading-tight text-ink', chromeText.sm)}>
          {showProblems ? problemsTitle : 'Explorer'}
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Close explorer"
          aria-label="Close explorer"
          className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
        >
          <X className="h-3 w-3" />
        </button>
      </header>

      <div className="relative shrink-0 border-b border-edge px-[var(--hpad)] py-1">
        <Search className="pointer-events-none absolute left-[calc(var(--hpad)+8px)] top-1/2 h-3 w-3 -translate-y-1/2 text-ink3" />
        <input
          type="search"
          value={sidebarSearch}
          onChange={(e) => setSidebarSearch(e.target.value)}
          placeholder="Search catalog, problems, panels…"
          aria-label="Search explorer"
          className={cn('w-full rounded-md border border-edge bg-panel2 py-0.5 pl-7 pr-2 text-ink outline-none placeholder:text-ink3 focus:border-accent', chromeText.sm)}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SidebarSection
          icon={<Library className="h-3 w-3" />}
          title="Catalog"
          open={catalogOpen}
          onToggle={() => setCatalogOpen((o) => !o)}
          fill={catalogOpen}
        >
          <CatalogTree searchQuery={sidebarSearch} />
        </SidebarSection>

        <div className="mt-auto flex shrink-0 flex-col">
          {showProblems && (
            <SidebarSection
              icon={<FileText className="h-3 w-3" />}
              title="Problems"
              badge={
                <span className={cn('shrink-0 rounded-full bg-panel2 px-1.5 py-px font-mono tabular-nums text-ink3', chromeText.xs)}>
                  {searching ? filteredProblems.length : siblingItems.length}
                </span>
              }
              open={problemsOpen}
              onToggle={() => setProblemsOpen((o) => !o)}
              maxHeightClass={SECTION_MAX.problems}
              anchor="bottom"
            >
              {searching && filteredProblems.length === 0 ? (
                <div className={cn('px-[var(--hpad)] py-2 leading-snug text-ink3', chromeText.sm)}>No matching problems</div>
              ) : (
                <div className="flex flex-col gap-0.5 px-1">
                  {filteredProblems.map((it) => {
                    const active = it.id === activeItemId;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => switchTo(it.id)}
                        title={it.title}
                        className={cn(
                          'flex w-full min-h-[var(--row)] items-center gap-2 rounded-md border-l-2 px-2 py-0 text-left transition-colors',
                          active
                            ? 'border-l-accent bg-accentbg font-medium text-accent'
                            : 'border-l-transparent text-ink2 hover:bg-panel2 hover:text-ink',
                        )}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: STATUS_DOT[it.status] }}
                          title={it.status}
                        />
                        <span className={cn('min-w-0 flex-1 truncate', chromeText.sm)}>{it.title}</span>
                        {statFor(progress, it.id).mastered && (
                          <Trophy className="h-3 w-3 shrink-0 text-good" aria-label="mastered" />
                        )}
                        {it.difficulty && <span className={cn('shrink-0 text-ink3', chromeText.xs)}>{it.difficulty}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              {!searching && (
                <button
                  type="button"
                  onClick={() => {
                    const catId = categoryIdForItem(activeItemId, catalog);
                    if (catId) {
                      const track = trackForCategory(catId);
                      if (track) setActiveTrackId(track.id);
                      setActiveCategoryId(catId);
                      setProblemFocused(false);
                    }
                  }}
                  title="Open the category grid"
                  className={cn('mx-1 mt-1.5 flex min-h-[var(--row)] w-[calc(100%-8px)] items-center gap-1.5 rounded-md px-2 py-0 text-ink3 transition-colors hover:bg-panel2 hover:text-ink', chromeText.sm)}
                >
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-left">Category grid</span>
                </button>
              )}
            </SidebarSection>
          )}

          {showAdd && canvasAdd && (
            <>
              <SidebarSection
                icon={<Plus className="h-3 w-3" />}
                title="Add panel"
                open={addOpen}
                onToggle={() => setAddOpen((o) => !o)}
                maxHeightClass={SECTION_MAX.addPanel}
                anchor="bottom"
              >
                <div className="px-[var(--hpad)]">
                  {!currentTab && !searching ? (
                    <div className="flex flex-col items-center gap-1.5 px-2 py-4 text-center">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-panel2 text-ink3">
                        <LayoutGrid className="h-4 w-4" />
                      </span>
                      <p className={cn('font-medium text-ink2', chromeText.sm)}>All panels on canvas</p>
                      <p className={cn('leading-snug text-ink3', chromeText.sm)}>Remove a panel to re-add it here.</p>
                    </div>
                  ) : searching ? (
                    groupedPanelResults!.length === 0 ? (
                      <div className={cn('py-2 leading-snug text-ink3', chromeText.sm)}>No matching panels</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {groupedPanelResults!.map((group) => (
                          <div key={group.key}>
                            <Label className="mb-1 px-1">{group.key}</Label>
                            <div className="flex flex-col gap-0.5">
                              {group.items.map((k) => (
                                <AddItem
                                  key={k.id}
                                  kind={k.id}
                                  title={k.title}
                                  dndKey={canvasAdd.dndKey}
                                  onAddKind={canvasAdd.onAddKind}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <>
                      <div className="mb-2 flex flex-wrap gap-1">
                        {tabs.map((t, i) => (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => setActiveTab(i)}
                            title={t.key}
                            aria-label={t.key}
                            aria-pressed={i === tabIdx}
                            className={cn(
                              'flex max-w-full min-h-[var(--row)] items-center gap-1 rounded-md px-1.5 py-0 transition-colors',
                              i === tabIdx ? 'bg-accentbg text-accent' : 'text-ink2 hover:bg-panel2 hover:text-ink',
                            )}
                          >
                            <span className="shrink-0">{t.icon}</span>
                            <span className={cn('truncate', chromeText.sm)}>{t.key}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {(currentTab?.items ?? []).map((k) => (
                          <AddItem
                            key={k.id}
                            kind={k.id}
                            title={k.title}
                            dndKey={canvasAdd.dndKey}
                            onAddKind={canvasAdd.onAddKind}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </SidebarSection>
              {canvasAdd.addableEffects && canvasAdd.addableEffects.length > 0 && (
                <SidebarSection
                  icon={<Shapes className="h-3 w-3" />}
                  title="Effects"
                  open={addOpen}
                  onToggle={() => setAddOpen((o) => !o)}
                  maxHeightClass={SECTION_MAX.addPanel}
                  anchor="bottom"
                >
                  <div className="flex flex-col gap-0.5 px-1">
                    {canvasAdd.addableEffects.map((eff) => (
                      <button
                        key={eff.id}
                        type="button"
                        draggable
                        onClick={() => canvasAdd.onAddEffect?.(eff.id)}
                        onDragStart={(e: DragEvent) => {
                          if (canvasAdd.effectDndKey) e.dataTransfer.setData(canvasAdd.effectDndKey, eff.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className="flex w-full min-h-[var(--row)] cursor-grab items-center gap-2 rounded-md border border-transparent px-2 py-0 text-left transition-colors hover:border-edge hover:bg-panel2 active:cursor-grabbing"
                      >
                        <span className={cn('min-w-0 flex-1 truncate text-ink2', chromeText.sm)}>{eff.title}</span>
                      </button>
                    ))}
                  </div>
                </SidebarSection>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileDrawer side="left" label="Explorer" onClose={onClose}>
        {panel}
      </MobileDrawer>
    );
  }

  return panel;
}
