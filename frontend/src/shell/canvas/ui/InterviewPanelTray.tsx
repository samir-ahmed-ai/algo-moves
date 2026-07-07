import {
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { GripVertical, Lock, Maximize2, Minimize2, Plus, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import { useCanvasCollabOptional } from '@/shell/collab';
import { nodeIcon } from '@/shell/panels/panelIcons';
import { chromeText } from '../../chromeUi';
import { RADIUS_SHELL } from './nodeui';
import {
  buildToolDockSections,
  clampDockPosition,
  countToolDockItems,
  filterToolDockSections,
  readToolDockPrefs,
  shouldShowToolDock,
  toolDockLockState,
  writeToolDockPrefs,
  type ToolDockItem,
  type ToolDockPrefs,
} from './toolDock';

const SEARCH_THRESHOLD = 6;

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-0';

function DockItemButton({
  item,
  collapsed,
  disabled,
  lockHint,
  dndKey,
  effectDndKey,
  onAdd,
}: {
  item: ToolDockItem;
  collapsed: boolean;
  disabled: boolean;
  lockHint: string | null;
  dndKey: string;
  effectDndKey?: string;
  onAdd: (item: ToolDockItem) => void;
}) {
  const icon =
    item.type === 'effect' ? <Sparkles className="h-3.5 w-3.5 text-accent" /> : nodeIcon(item.id);
  const label = disabled && lockHint ? `${item.title} — ${lockHint}` : `Add ${item.title}`;

  return (
    <button
      type="button"
      draggable={!disabled}
      disabled={disabled}
      onClick={() => onAdd(item)}
      onDragStart={(e: DragEvent) => {
        if (disabled) return;
        const key = item.type === 'effect' ? effectDndKey : dndKey;
        if (!key) return;
        e.dataTransfer.setData(key, item.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      title={label}
      aria-label={label}
      className={cn(
        'tool-dock__item flex w-full items-center rounded-md text-left text-ink2 transition-colors',
        collapsed ? 'h-8 justify-center' : 'gap-1.5 px-2 py-1.5',
        disabled
          ? 'cursor-not-allowed opacity-45'
          : 'cursor-grab hover:bg-panel2 hover:text-ink active:cursor-grabbing',
        FOCUS_RING,
        chromeText.sm,
      )}
    >
      <span className="grid h-3.5 w-3.5 shrink-0 place-items-center">{icon}</span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate">{item.title}</span>
            {item.hint && (
              <span className={cn('block truncate text-ink3', chromeText['2xs'])}>{item.hint}</span>
            )}
          </span>
          {disabled ? (
            <Lock className="h-3 w-3 shrink-0 text-ink3" />
          ) : item.multi ? (
            <Plus className="h-3 w-3 shrink-0 text-ink3/70" aria-hidden />
          ) : null}
        </>
      )}
    </button>
  );
}

/**
 * Tool Dock — draggable, collapsible top-left palette for adding panels and
 * effects to the canvas. Shown on standalone visualize canvases and on any
 * canvas while a collab/interview session is live; items support click-to-add
 * and HTML5 drag onto the pane. Position + collapsed state persist locally.
 */
export function InterviewPanelTray() {
  const { canvasAdd, mode, present, problemFocused } = useWorkspace();
  const collab = useCanvasCollabOptional();

  const [prefs, setPrefs] = useState<ToolDockPrefs>(() => readToolDockPrefs());
  const [query, setQuery] = useState('');
  const dockRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const kinds = canvasAdd?.addableKinds;
  const effects = canvasAdd?.addableEffects;
  const sections = useMemo(
    () => buildToolDockSections(kinds ?? [], effects ?? []),
    [kinds, effects],
  );
  const totalItems = countToolDockItems(sections);
  const sessionActive = collab != null && collab.session.kind !== 'solo';

  if (
    !canvasAdd ||
    !shouldShowToolDock({
      present,
      mode,
      hasItems: totalItems > 0,
      problemBound: problemFocused,
      sessionActive,
    })
  ) {
    return null;
  }

  const lock = toolDockLockState({
    sessionKind: collab?.session.kind ?? 'solo',
    isHost: collab?.isHost ?? true,
    runtimeLocked: collab?.session.interviewRuntime?.locked ?? false,
    guestCanMoveNodes: collab?.session.interview?.guestCanMoveNodes,
  });

  const collapsed = prefs.collapsed;
  const showSearch = !collapsed && totalItems > SEARCH_THRESHOLD;
  const visibleSections =
    collapsed || !showSearch ? sections : filterToolDockSections(sections, query);

  const commit = (next: ToolDockPrefs) => {
    setPrefs(next);
    writeToolDockPrefs(next);
  };

  const onAdd = (item: ToolDockItem) => {
    if (lock.locked) return;
    if (item.type === 'effect') canvasAdd.onAddEffect?.(item.id);
    else canvasAdd.onAddKind(item.id);
  };

  const onGripPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = dockRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      pointerId: e.pointerId,
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onGripPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = dockRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !el) return;
    const parentRect = (el.offsetParent as HTMLElement | null)?.getBoundingClientRect();
    const next = clampDockPosition(
      {
        x: e.clientX - (parentRect?.left ?? 0) - drag.dx,
        y: e.clientY - (parentRect?.top ?? 0) - drag.dy,
      },
      {
        width: parentRect?.width ?? window.innerWidth,
        height: parentRect?.height ?? window.innerHeight,
      },
      { width: el.offsetWidth, height: el.offsetHeight },
    );
    setPrefs((p) => ({ ...p, pos: next }));
  };

  const onGripPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    writeToolDockPrefs(prefsRef.current);
  };

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <div
      ref={dockRef}
      className={cn(
        'tool-dock nodrag nowheel nopan absolute z-10 flex select-none flex-col border border-edge bg-panel/95 shadow-[var(--shadow-lg)] backdrop-blur',
        collapsed ? 'w-11 p-1' : 'w-52 p-1.5',
        !prefs.pos && 'left-3 top-3',
        RADIUS_SHELL,
      )}
      style={prefs.pos ? { left: prefs.pos.x, top: prefs.pos.y } : undefined}
    >
      <div
        className={cn(
          'flex cursor-grab touch-none items-center active:cursor-grabbing',
          collapsed ? 'flex-col gap-0.5 pb-1' : 'gap-1 px-0.5 pb-1',
        )}
        onPointerDown={onGripPointerDown}
        onPointerMove={onGripPointerMove}
        onPointerUp={onGripPointerUp}
        onPointerCancel={onGripPointerUp}
        onDoubleClick={() => commit({ ...prefsRef.current, pos: null })}
        title="Drag to move · double-click to reset"
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-ink3" aria-hidden />
        {!collapsed && (
          <span
            className={cn(
              'flex-1 font-semibold uppercase tracking-wide text-ink3',
              chromeText['2xs'],
            )}
          >
            Tool dock
          </span>
        )}
        <button
          type="button"
          title={collapsed ? 'Expand tool dock' : 'Collapse tool dock'}
          aria-label={collapsed ? 'Expand tool dock' : 'Collapse tool dock'}
          aria-expanded={!collapsed}
          onClick={() => commit({ ...prefsRef.current, collapsed: !collapsed })}
          onPointerDown={stop}
          onDoubleClick={stop}
          className={cn(
            'grid h-5 w-5 shrink-0 place-items-center rounded text-ink3 transition-colors hover:bg-panel2 hover:text-ink',
            FOCUS_RING,
          )}
        >
          {collapsed ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
        </button>
      </div>

      {showSearch && (
        <div className="mb-1 flex items-center gap-1.5 rounded-md border border-edge bg-panel2/60 px-2 py-1">
          <Search className="h-3 w-3 shrink-0 text-ink3" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter tools"
            aria-label="Filter tools"
            className={cn(
              'w-full min-w-0 bg-transparent text-ink outline-none placeholder:text-ink3',
              chromeText.sm,
            )}
          />
        </div>
      )}

      <div
        className={cn(
          'flex max-h-[min(60vh,520px)] flex-col overflow-y-auto overflow-x-hidden',
          collapsed ? 'gap-0.5' : 'gap-1',
        )}
      >
        {visibleSections.map((section, i) => (
          <div key={section.id}>
            {collapsed ? (
              i > 0 && <div className="mx-auto mb-0.5 h-px w-5 bg-edge" aria-hidden />
            ) : (
              <p
                className={cn(
                  'px-2 pb-0.5 pt-1 font-semibold uppercase tracking-wide text-ink3',
                  chromeText['2xs'],
                )}
              >
                {section.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <DockItemButton
                  key={`${item.type}:${item.id}`}
                  item={item}
                  collapsed={collapsed}
                  disabled={lock.locked}
                  lockHint={lock.hint}
                  dndKey={canvasAdd.dndKey}
                  effectDndKey={canvasAdd.effectDndKey}
                  onAdd={onAdd}
                />
              ))}
            </div>
          </div>
        ))}
        {!collapsed && visibleSections.length === 0 && (
          <p className={cn('px-2 py-1.5 text-ink3', chromeText.xs)}>No tools match “{query}”</p>
        )}
      </div>

      {lock.locked &&
        (collapsed ? (
          <span
            title={lock.hint ?? undefined}
            className="mt-0.5 grid h-6 place-items-center text-ink3"
          >
            <Lock className="h-3 w-3" />
          </span>
        ) : (
          <div
            className={cn(
              'mt-1 flex items-center gap-1.5 rounded-md bg-panel2/60 px-2 py-1 text-ink3',
              chromeText['2xs'],
            )}
          >
            <Lock className="h-3 w-3 shrink-0" aria-hidden />
            {lock.hint}
          </div>
        ))}
    </div>
  );
}
