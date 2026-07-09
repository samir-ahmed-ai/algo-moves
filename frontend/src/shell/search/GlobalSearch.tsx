import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { catalog } from '@/content';
import { getItemsForCategory } from '@/content/browse';
import {
  flattenSearchSections,
  mergeSearchSections,
  searchClient,
  serverHitToSearchHit,
  type SearchDocument,
  type SearchHit,
  type SearchSection,
} from '@/lib/search';
import { cn } from '@/lib/utils/cn';
import { searchServer } from '@/platform/api/searchApi';
import { useAuth } from '@/shell/auth';
import { ChromeToken, chromeText } from '@/shell/chromeUi';
import { useWorkspace } from '@/store/workspace';
import {
  buildInterviewCommands,
  parseCommandSelectionKey,
  resolveCommandSelection,
  type CommandPaletteCommand,
} from '@/shell/workspace/commandPaletteModel';
import {
  readCommandPaletteRecentIds,
  recordCommandPaletteRecentId,
} from '@/shell/workspace/commandPaletteHistory';
import { getPluginMeta } from '@/core';
import { buildShareUrl } from '@/store/navigation';

const SERVER_DEBOUNCE_MS = 150;

function commandToExtraDoc(command: CommandPaletteCommand): SearchDocument {
  return {
    kind: command.id.startsWith('panel:')
      ? 'panel'
      : command.id.startsWith('effect:')
        ? 'effect'
        : 'action',
    id: command.id,
    title: command.label,
    ...(command.hint ? { subtitle: command.hint } : {}),
    ...(command.keywords?.length ? { keywords: command.keywords } : {}),
  };
}

function hitKey(hit: SearchHit): string {
  return `${hit.kind}:${hit.id}`;
}

export type SelectionKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

export function GlobalSearchDialog({
  open,
  onClose,
  workspaceExtras = true,
}: {
  open: boolean;
  onClose: () => void;
  /** Include workspace-only actions/panels when workspace context is available. */
  workspaceExtras?: boolean;
}) {
  const {
    activeItemId,
    canvasAdd,
    canvasInterview,
    dir,
    enterCanvas,
    enterCollabCanvas,
    enterGames,
    enterPlans,
    enterResumes,
    mode,
    openProblem,
    palette,
    problemFocused,
    setMode,
    setPalette,
    setPresent,
    setSettingsOpen,
    setTheme,
    theme,
    themePreset,
  } = useWorkspace();
  const { profile, isAnonymous, configured } = useAuth();
  const signedIn = configured && profile && !isAnonymous;

  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [recentIds, setRecentIds] = useState(() => readCommandPaletteRecentIds());
  const [serverHits, setServerHits] = useState<SearchHit[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const listboxId = useId();
  const titleId = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestGen = useRef(0);

  // Reset query when opened.
  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setServerHits([]);
      setRecentIds(readCommandPaletteRecentIds());
    }
  }, [open]);

  const workspaceCommands = useMemo<CommandPaletteCommand[]>(() => {
    if (!workspaceExtras) return [];
    const actions: CommandPaletteCommand[] = [
      {
        id: 'mode:play',
        label: 'Mode: Play',
        hint: 'action',
        keywords: ['practice', 'run animation'],
        run: () => setMode('play'),
      },
      {
        id: 'mode:learn',
        label: 'Mode: Learn',
        hint: 'action',
        keywords: ['study', 'explanation'],
        run: () => setMode('learn'),
      },
      {
        id: 'mode:visualize',
        label: 'Mode: Canvas',
        hint: 'action',
        keywords: ['visualize', 'diagram', 'panels'],
        run: () => enterCanvas(),
      },
      {
        id: 'present',
        label: 'Enter presentation mode',
        hint: 'action',
        keywords: ['fullscreen'],
        run: () => setPresent(true),
      },
      {
        id: 'settings',
        label: 'Open settings',
        hint: 'action',
        keywords: ['preferences', 'options'],
        run: () => setSettingsOpen(true),
      },
      {
        id: 'theme',
        label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
        hint: 'action',
        keywords: ['appearance'],
        run: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'palette',
        label: `${palette === 'cb' ? 'Disable' : 'Enable'} colour-blind palette`,
        hint: 'action',
        keywords: ['color blind', 'colorblind', 'accessibility'],
        run: () => setPalette(palette === 'cb' ? 'default' : 'cb'),
      },
      {
        id: 'share',
        label: 'Copy share link',
        hint: 'action',
        keywords: ['copy url', 'permalink'],
        run: () => {
          const canvasFocus = mode === 'visualize' && !problemFocused;
          const pluginNumber = getPluginMeta(activeItemId)?.number;
          const url = buildShareUrl(
            canvasFocus
              ? { mode, focus: 'canvas', theme, palette, themePreset, dir }
              : {
                  item: activeItemId,
                  ...(pluginNumber !== undefined ? { id: pluginNumber } : {}),
                  mode,
                  focus: 'problem',
                  theme,
                  palette,
                  themePreset,
                  dir,
                },
          );
          navigator.clipboard?.writeText(url).catch(() => {});
        },
      },
      {
        id: 'nav:plans',
        label: 'Open study plans',
        hint: 'action',
        keywords: ['prep', 'interview plan'],
        run: () => enterPlans(),
      },
      {
        id: 'nav:resumes',
        label: 'Open resumes',
        hint: 'action',
        keywords: ['cv', 'resume'],
        run: () => enterResumes(),
      },
      {
        id: 'nav:games',
        label: 'Open games',
        hint: 'action',
        keywords: ['arcade', 'multiplayer'],
        run: () => enterGames(),
      },
      {
        id: 'nav:interview-canvas',
        label: 'Open interview canvas',
        hint: 'action',
        keywords: ['collab', 'whiteboard'],
        run: () => enterCollabCanvas(),
      },
    ];
    const panelCmds: CommandPaletteCommand[] = (canvasAdd?.addableKinds ?? []).map((k) => ({
      id: `panel:${k.id}`,
      label: `Add panel: ${k.title}`,
      hint: 'panel',
      keywords: [k.id],
      run: () => canvasAdd?.onAddKind(k.id),
    }));
    const effectCmds: CommandPaletteCommand[] = (canvasAdd?.addableEffects ?? []).map((e) => ({
      id: `effect:${e.id}`,
      label: `Add effect: ${e.title}`,
      hint: 'effect',
      keywords: [e.id],
      run: () => canvasAdd?.onAddEffect?.(e.id),
    }));
    return [...actions, ...buildInterviewCommands(canvasInterview), ...panelCmds, ...effectCmds];
  }, [
    activeItemId,
    canvasAdd,
    canvasInterview,
    dir,
    enterCanvas,
    enterCollabCanvas,
    enterGames,
    enterPlans,
    enterResumes,
    mode,
    palette,
    problemFocused,
    setMode,
    setPalette,
    setPresent,
    setSettingsOpen,
    setTheme,
    theme,
    themePreset,
    workspaceExtras,
  ]);

  const commandById = useMemo(() => {
    const map = new Map<string, CommandPaletteCommand>();
    for (const c of workspaceCommands) map.set(c.id, c);
    return map;
  }, [workspaceCommands]);

  // Debounced server search.
  useEffect(() => {
    if (!open || !signedIn) {
      setServerHits([]);
      setServerLoading(false);
      return;
    }
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setServerHits([]);
      setServerLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setServerLoading(true);
    const gen = ++requestGen.current;
    debounceRef.current = setTimeout(() => {
      void searchServer(trimmed).then((hits) => {
        if (gen !== requestGen.current) return;
        setServerHits(hits.map(serverHitToSearchHit));
        setServerLoading(false);
      });
    }, SERVER_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, q, signedIn]);

  const sections: SearchSection[] = useMemo(() => {
    const trimmed = q.trim();
    const extra = workspaceCommands.map(commandToExtraDoc);

    if (!trimmed) {
      const actionHits = searchClient('', {
        kinds: ['action', 'panel', 'effect'],
        extra,
        limit: 30,
        recentIds,
      });
      const recentHits: SearchHit[] = [];
      for (const id of recentIds) {
        const cmd = commandById.get(id);
        if (cmd) {
          recentHits.push({
            kind: 'action',
            id: cmd.id,
            title: cmd.label,
            ...(cmd.hint ? { subtitle: cmd.hint } : {}),
            score: 100,
            run: cmd.run,
          });
          continue;
        }
        // Recent problem opens stored as open:<itemId>
        if (id.startsWith('open:')) {
          const itemId = id.slice(5);
          const item = catalog.getItem(itemId);
          if (item) {
            recentHits.push({
              kind: 'problem',
              id: item.id,
              title: item.title,
              subtitle: item.difficulty ?? 'problem',
              score: 100,
            });
          }
        }
      }
      return mergeSearchSections(actionHits, [], { query: '', recentHits });
    }

    const clientHits = searchClient(trimmed, {
      extra,
      limit: 40,
      recentIds,
      kinds: ['problem', 'category', 'glossary', 'game', 'action', 'panel', 'effect'],
    });
    // Attach run handlers for action/panel/effect hits.
    const withRuns: SearchHit[] = clientHits.map((hit) => {
      const cmd = commandById.get(hit.id);
      if (!cmd) return hit;
      return {
        ...hit,
        run: cmd.run,
        title: cmd.label,
        ...(cmd.hint ? { subtitle: cmd.hint } : hit.subtitle ? { subtitle: hit.subtitle } : {}),
      };
    });
    return mergeSearchSections(withRuns, serverHits, { query: trimmed });
  }, [q, workspaceCommands, commandById, recentIds, serverHits]);

  const visibleHits = useMemo(() => flattenSearchSections(sections), [sections]);
  const hitIndexByKey = useMemo(
    () => new Map(visibleHits.map((hit, index) => [hitKey(hit), index] as const)),
    [visibleHits],
  );
  const clampedSel = visibleHits.length ? Math.min(sel, visibleHits.length - 1) : 0;
  const activeHit = visibleHits[clampedSel];
  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const activeOptionId = activeHit ? optionId(clampedSel) : null;

  const exec = useCallback(
    (hit?: SearchHit) => {
      if (!hit) return;
      setRecentIds(
        recordCommandPaletteRecentId(hit.kind === 'problem' ? `open:${hit.id}` : hit.id),
      );
      if (hit.run) {
        hit.run();
        onClose();
        return;
      }
      switch (hit.kind) {
        case 'problem':
          openProblem(hit.id);
          break;
        case 'category': {
          const first = getItemsForCategory(hit.id, catalog)[0];
          if (first) openProblem(first.id);
          break;
        }
        case 'glossary':
          setMode('learn');
          break;
        case 'game':
          enterGames();
          break;
        case 'plan':
          enterPlans();
          break;
        case 'resume':
          enterResumes();
          break;
        case 'interview':
          enterCollabCanvas();
          break;
        case 'canvas':
          enterCanvas();
          break;
        default:
          break;
      }
      onClose();
    },
    [
      enterCanvas,
      enterCollabCanvas,
      enterGames,
      enterPlans,
      enterResumes,
      onClose,
      openProblem,
      setMode,
    ],
  );

  useEffect(() => {
    if (!activeOptionId) return;
    document.getElementById(activeOptionId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeOptionId]);

  if (!open) return null;

  return (
    <div
      className="command-palette-overlay fixed inset-0 z-[80] grid place-items-start justify-items-center bg-bg/70 pt-[12vh] backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="true"
    >
      <div
        className="command-palette w-[480px] max-w-[92vw] overflow-hidden rounded-3xl border border-edge bg-[var(--surface-glass)] shadow-theme-xl ring-1 ring-accent/10 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="sr-only">
          Search
        </h2>
        <div className="flex items-center gap-2 border-b border-edge px-[var(--hpad)]">
          <Search className="h-4 w-4 shrink-0 text-ink3" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              const selectionKey = parseCommandSelectionKey(e.key);
              if (selectionKey) {
                e.preventDefault();
                setSel((s) => resolveCommandSelection(s, visibleHits.length, selectionKey));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                exec(activeHit);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Search problems, glossary, plans…"
            className={cn(
              'command-palette__input w-full bg-transparent py-[var(--pad)] text-ink outline-none placeholder:text-ink3',
              chromeText.base,
            )}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded="true"
            {...(activeOptionId ? { 'aria-activedescendant': activeOptionId } : {})}
            aria-label="Search"
          />
          {serverLoading ? (
            <span className="shrink-0 text-[length:var(--fs-2xs)] text-ink3">…</span>
          ) : null}
        </div>
        <div className="sr-only" aria-live="polite">
          {visibleHits.length === 0
            ? 'No matching results'
            : `${visibleHits.length} result${visibleHits.length === 1 ? '' : 's'} available`}
        </div>
        <div
          id={listboxId}
          className="command-palette__list ws-scroll max-h-[50vh] overflow-auto py-0.5"
          role="listbox"
          aria-label="Search results"
        >
          {visibleHits.length === 0 ? (
            <div
              className={cn(
                'command-palette__empty px-[var(--hpad)] py-8 text-center text-ink3',
                chromeText.base,
              )}
            >
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-2xl border border-edge bg-panel/70 text-ink3">
                ?
              </div>
              {q.trim() ? 'No matching results.' : 'Type to search the catalog.'}
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.id}>
                <div
                  className={cn(
                    'command-palette__section-label px-[var(--hpad)] pt-[var(--pad)] pb-[var(--gap)] text-[length:var(--fs-tight)] font-semibold uppercase tracking-[0.18em] text-ink3',
                    chromeText.base,
                  )}
                >
                  {section.label}
                </div>
                {section.hits.map((hit) => {
                  const index = hitIndexByKey.get(hitKey(hit));
                  if (index == null) return null;
                  return (
                    <button
                      id={optionId(index)}
                      key={hitKey(hit)}
                      type="button"
                      role="option"
                      aria-selected={index === clampedSel}
                      onMouseEnter={() => setSel(index)}
                      onClick={() => exec(hit)}
                      className={cn(
                        'flex min-h-[var(--row)] w-full items-center justify-between gap-[var(--gap)] px-[var(--hpad)] py-[var(--gap)] text-left transition-colors',
                        'command-palette__option',
                        index === clampedSel
                          ? 'command-palette__option--active bg-accentbg text-accent'
                          : 'text-ink2 hover:bg-panel2',
                      )}
                    >
                      <span className="truncate">{hit.title}</span>
                      {hit.subtitle ? (
                        <ChromeToken className="shrink-0">{hit.subtitle}</ChromeToken>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact header button that opens global search. */
export function SearchTrigger({ onOpen, className }: { onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel/60 px-2.5 py-1.5 text-xs font-medium text-ink3 transition hover:border-edge hover:bg-panel2 hover:text-ink',
        className,
      )}
      aria-label="Search"
      title="Search (⌘K)"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="hidden rounded border border-edge bg-panel px-1 py-0.5 font-mono text-2xs text-ink3 md:inline">
        ⌘K
      </kbd>
    </button>
  );
}

/** App-wide ⌘K listener + GlobalSearchDialog mount point. */
export function GlobalSearchHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <GlobalSearchDialog open={open} onClose={() => setOpen(false)} />
      <GlobalSearchBridge onOpen={() => setOpen(true)} />
    </>
  );
}

const OPEN_EVENT = 'algomoves:open-search';

function GlobalSearchBridge({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    const handler = () => onOpen();
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, [onOpen]);
  return null;
}

export function openGlobalSearch(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
