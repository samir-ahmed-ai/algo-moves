import { type DragEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  BookMarked,
  CheckCircle2,
  ChevronDown,
  Circle,
  CloudUpload,
  GripVertical,
  Loader2,
  Pencil,
  Play,
  Plus,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { catalog } from '@/content';
import { chromeText } from '@/shell/chromeUi';
import { usePlan } from './PlanContext';
import { useWorkspace } from '@/store/workspace';

// ─── Inline editable plan title ─────────────────────────────────────────────────

function EditableTitle({ title, onRename }: { title: string; onRename: (t: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(title);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, title]);

  const commit = useCallback(() => {
    onRename(draft);
    setEditing(false);
  }, [draft, onRename]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        maxLength={200}
        aria-label="Rename plan"
        className={cn(
          'plan-tray-title-input min-w-0 flex-1 rounded border border-accent/50 bg-panel2 px-1.5 py-0.5 text-ink outline-none ring-2 ring-accent/15',
          chromeText.sm,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Rename plan"
      className={cn(
        'plan-tray-title group/title flex min-w-0 flex-1 items-center gap-1 text-left font-semibold text-ink hover:text-accent',
        chromeText.sm,
      )}
    >
      <span className="truncate">{title}</span>
      <Pencil className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/title:opacity-60" />
    </button>
  );
}

// ─── One item row (drag-reorderable) ─────────────────────────────────────────────

function ItemRow({
  itemId,
  index,
  completed,
  onRemove,
  onToggle,
  onMove,
}: {
  itemId: string;
  index: number;
  completed: boolean;
  onRemove: () => void;
  onToggle: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const item = catalog.getItem(itemId);
  const label = item?.title ?? itemId;

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    },
    [index],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(fromIndex) && fromIndex !== index) onMove(fromIndex, index);
    },
    [index, onMove],
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'plan-tray-row group flex items-center gap-1.5 rounded-2xl border border-transparent px-1.5 py-1.5 transition',
        'hover:border-edge hover:bg-panel2 hover:shadow-theme-sm',
        completed && 'opacity-60',
      )}
    >
      <GripVertical className="plan-tray-row__grip h-3.5 w-3.5 shrink-0 cursor-grab text-ink3 opacity-40 group-hover:opacity-80" />

      <button
        type="button"
        onClick={onToggle}
        className="plan-tray-row__toggle shrink-0 rounded-full text-ink3 transition hover:text-good"
        title={completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {completed ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-good" />
        ) : (
          <Circle className="h-3.5 w-3.5" />
        )}
      </button>

      <span
        className={cn(
          'flex-1 truncate text-ink',
          chromeText.sm,
          completed && 'line-through text-ink3',
        )}
        title={label}
      >
        <span className="mr-1.5 text-ink3">{index + 1}.</span>
        {label}
      </span>

      <button
        type="button"
        onClick={onRemove}
        className="plan-tray-row__remove shrink-0 rounded-full p-0.5 text-ink3 opacity-0 transition hover:bg-panel hover:text-red-500 group-hover:opacity-100"
        title="Remove from plan"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Shared tray body (header, stats, list, footer) ──────────────────────────────

function TrayBody({
  onCollapse,
  collapseIcon,
}: {
  onCollapse: () => void;
  collapseIcon: ReactIcon;
}) {
  const {
    activePlan,
    itemIds,
    completed,
    saving,
    removeItem,
    reorderItem,
    toggleComplete,
    renamePlan,
    save,
    startRun,
    addItem,
    hasItem,
  } = usePlan();
  const { openProblem, activeItemId, problemFocused } = useWorkspace();

  const handleStartRun = useCallback(async () => {
    await save();
    if (itemIds.length > 0) {
      startRun(0);
      const firstItemId = itemIds[0];
      if (firstItemId) openProblem(firstItemId);
    }
  }, [save, startRun, itemIds, openProblem]);

  if (!activePlan) return null;

  const completedCount = itemIds.filter((id) => completed.has(id)).length;
  const canAddCurrent = problemFocused && !!activeItemId && !hasItem(activeItemId);
  const currentItem = canAddCurrent ? catalog.getItem(activeItemId) : null;
  const CollapseIcon = collapseIcon;

  return (
    <>
      {/* Header */}
      <div className="plan-tray-head flex h-12 shrink-0 items-center gap-2 border-b border-edge bg-panel/40 px-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-2xl bg-accent text-[var(--accent-contrast)] shadow-theme-sm">
          <BookMarked className="h-3.5 w-3.5" />
        </span>
        <EditableTitle title={activePlan.title} onRename={renamePlan} />
        <button
          type="button"
          onClick={onCollapse}
          className="plan-tray-head__close shrink-0 rounded-full p-1 text-ink3 transition hover:bg-panel2 hover:text-ink"
          title="Close plan"
        >
          <CollapseIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Stats row */}
      <div
        className={cn(
          'flex items-center gap-2 border-b border-edge px-3 py-2 text-ink3',
          'plan-tray-stats',
          chromeText.xs,
        )}
      >
        <span>
          {itemIds.length === 0
            ? 'No problems added'
            : `${completedCount} / ${itemIds.length} done`}
        </span>
        {saving && <Loader2 className="h-3 w-3 animate-spin" />}
        {!saving && itemIds.length > 0 && (
          <button
            type="button"
            onClick={save}
            className="ml-auto rounded-full p-1 text-accent transition hover:bg-accentbg"
            title="Save now"
          >
            <CloudUpload className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Item list */}
      <div className="plan-tray-list min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
        {itemIds.length === 0 ? (
          <div className="plan-tray-empty mt-6 px-2 text-center text-ink3">
            <p className={chromeText.sm}>Click a problem card to add it.</p>
          </div>
        ) : (
          itemIds.map((id, i) => (
            <ItemRow
              key={id}
              itemId={id}
              index={i}
              completed={completed.has(id)}
              onRemove={() => removeItem(id)}
              onToggle={() => toggleComplete(id)}
              onMove={reorderItem}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="plan-tray-footer flex flex-col gap-2 border-t border-edge p-2.5">
        {canAddCurrent && (
          <button
            type="button"
            onClick={() => addItem(activeItemId)}
            className="plan-tray-add-current flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-edge py-2 text-sm font-medium text-ink3 transition hover:border-accent/50 hover:bg-panel2 hover:text-ink"
            title="Add the problem you're viewing"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="truncate">Add {currentItem?.title ?? 'current problem'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleStartRun}
          disabled={itemIds.length === 0}
          className="plan-tray-start flex w-full items-center justify-center gap-1.5 rounded-full bg-accent py-2 text-sm font-semibold text-[var(--accent-contrast)] shadow-theme-sm transition hover:-translate-y-0.5 hover:opacity-90 hover:shadow-theme-md disabled:translate-y-0 disabled:opacity-40"
        >
          <Play className="h-3.5 w-3.5" />
          Start run
        </button>
      </div>
    </>
  );
}

type ReactIcon = typeof XCircle;

// ─── Tray shell (responsive) ─────────────────────────────────────────────────────

export function PlanTray() {
  const { activePlan, itemIds, completed, isBuilding, isRunning, closePlan } = usePlan();
  const { isMobile } = useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide the tray during a run (the runner bar takes over) or when nothing loaded.
  if (!isBuilding || isRunning || !activePlan) return null;

  // ── Mobile: collapsible bottom sheet with a compact pill ──
  if (isMobile) {
    const completedCount = itemIds.filter((id) => completed.has(id)).length;
    return (
      <>
        {mobileOpen && (
          <div
            className="plan-tray-mobile-backdrop fixed inset-0 z-40 bg-bg/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}
        <div
          className={cn(
            'plan-tray-mobile fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t border-edge bg-[var(--surface-glass)] shadow-theme-xl backdrop-blur-xl transition-transform',
            mobileOpen ? 'h-[70dvh] translate-y-0' : 'h-auto',
          )}
        >
          {mobileOpen ? (
            <TrayBody onCollapse={() => setMobileOpen(false)} collapseIcon={ChevronDown} />
          ) : (
            <div className="plan-tray-mobile-pill flex items-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex flex-1 items-center gap-2 text-left"
                aria-label="Expand plan tray"
              >
                <BookMarked className="h-4 w-4 shrink-0 text-accent" />
                <span className={cn('flex-1 truncate font-semibold text-ink', chromeText.sm)}>
                  {activePlan.title}
                </span>
                <span className={cn('shrink-0 text-ink3', chromeText.xs)}>
                  {itemIds.length === 0 ? 'empty' : `${completedCount}/${itemIds.length}`}
                </span>
              </button>
              <button
                type="button"
                onClick={closePlan}
                className="shrink-0 rounded-full p-1 text-ink3 hover:bg-panel2 hover:text-ink"
                title="Close plan"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Desktop: docked right panel ──
  return (
    <div className="plan-tray-desktop flex w-64 shrink-0 flex-col border-l border-edge bg-[var(--surface-glass)] shadow-[-12px_0_40px_hsl(0_0%_0%_/_0.08)] backdrop-blur-xl">
      <TrayBody onCollapse={closePlan} collapseIcon={XCircle} />
    </div>
  );
}
