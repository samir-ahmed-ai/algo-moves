import { useCallback, useState, type Dispatch, type MutableRefObject, type ReactNode, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import type { EditorView } from '@codemirror/view';
import {
  Eye,
  EyeOff,
  Keyboard,
  RotateCcw,
  ScanEye,
  Settings2,
  TextQuote,
  Timer,
  AlignVerticalSpaceAround,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react';
import { autoSelectAndIndent } from '@/lib/editor/codeFormat';
import { Chip } from '@/shell/canvas';
import { cn } from '@/lib/utils/cn';
import { chromeText, ChromeLabel } from '@/shell/chromeUi';
import type { EditorPrefs } from '@/store/user-prefs';
import { recallEditorMenuItems } from './recallEditorControls';
import { ToolbarGroup, ToolbarGroupBtn } from './ToolbarGroup';
import { useAnchoredPopover } from '@/shell/ui/useAnchoredPopover';

/** Compact popover combining Session controls + Editor settings under one trigger. */
function RecallSettingsPopover({
  timerRunning,
  setTimerRunning,
  timerLabel,
  persistDraft,
  editorPrefs,
  setEditorPrefs,
  compact,
  draftViewRef,
  formatBothRef,
  foldBothRef,
  lang,
}: {
  timerRunning: boolean;
  setTimerRunning: Dispatch<SetStateAction<boolean>>;
  timerLabel: string;
  persistDraft: (v: string) => void;
  editorPrefs: EditorPrefs;
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void;
  compact?: boolean;
  draftViewRef?: MutableRefObject<EditorView | null>;
  formatBothRef?: MutableRefObject<(() => void) | null>;
  foldBothRef?: MutableRefObject<{ collapse: () => void; expand: () => void } | null>;
  lang?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { anchorRef, panelRef, pos, panelStyle } = useAnchoredPopover(open, close, 'right', 300);

  const editorItems = recallEditorMenuItems(
    editorPrefs,
    setEditorPrefs,
    draftViewRef?.current,
    formatBothRef?.current,
    foldBothRef?.current,
    lang,
  );

  const sessionCards = [
    {
      id: 'timer',
      icon: <Timer className="h-4 w-4" />,
      title: timerRunning ? 'Stop timer' : 'Start timer',
      subtitle: timerRunning ? timerLabel : 'Timed recall',
      active: timerRunning,
      onClick: () => setTimerRunning((r) => !r),
    },
    {
      id: 'clear',
      icon: <RotateCcw className="h-4 w-4" />,
      title: 'Clear draft',
      subtitle: '⌘⇧R',
      active: false,
      onClick: () => { persistDraft(''); setOpen(false); },
    },
  ];

  return (
    <div className="relative shrink-0">
      <button
        ref={anchorRef}
        type="button"
        title="Recall settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'grid place-items-center rounded-md border border-edge bg-panel2/60 transition-colors hover:bg-panel2',
          open && 'border-accent/40 bg-panel2 text-accent',
          compact ? 'h-[calc(var(--row)*0.875)] w-[calc(var(--row)*0.875)]' : 'h-[var(--row,28px)] w-[var(--row,28px)]',
        )}
      >
        <Settings2 className="h-3.5 w-3.5 text-ink3" />
      </button>

      {open &&
        pos &&
        panelStyle &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Recall settings"
            style={panelStyle}
            className="fixed z-[200] rounded-lg border border-edge bg-panel shadow-[var(--shadow-xl)]"
          >
          {/* Session */}
          <div className="p-2">
            <ChromeLabel className="mb-1.5 px-1">Session</ChromeLabel>
            <div className="flex gap-1.5">
              {sessionCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={card.onClick}
                  className={cn(
                    'flex w-[min(8rem,42%)] flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-colors',
                    card.active
                      ? 'border-accent/60 bg-accentbg'
                      : 'border-edge bg-panel2/60 hover:border-accent/40 hover:bg-panel2',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-md border border-dashed',
                      card.active ? 'border-accent/40 bg-panel text-accent' : 'border-edge bg-panel text-ink3',
                    )}
                  >
                    {card.icon}
                  </span>
                  <span className="w-full">
                    <span
                      className={cn(
                        'block truncate font-medium',
                        chromeText.xs,
                        card.active ? 'text-accent' : 'text-ink',
                      )}
                    >
                      {card.title}
                    </span>
                    <span className={cn('block truncate text-ink3', chromeText.xs)}>{card.subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Editor settings */}
          <div className="border-t border-edge px-2 pb-2 pt-2">
            <ChromeLabel className="mb-1.5 px-1">Editor</ChromeLabel>
            <div className="flex flex-col gap-0.5">
              {editorItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => { if (!item.disabled) item.onClick(); }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors disabled:opacity-40',
                    chromeText.sm,
                    item.active ? 'bg-accentbg text-accent' : 'text-ink2 hover:bg-panel2 hover:text-ink',
                  )}
                >
                  {item.icon && (
                    <span className="grid h-4 w-4 shrink-0 place-items-center">{item.icon}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Compact grouped recall controls — shared by RecallPane and Code Studio header. */
export function RecallToolbar({
  blind,
  setBlind,
  peek,
  setPeek,
  persistDraft,
  timerRunning,
  setTimerRunning,
  timerLabel,
  editorPrefs,
  setEditorPrefs,
  compact,
  showTitle,
  scorePct,
  className,
  trailing,
  draftViewRef,
  formatBothRef,
  foldBothRef,
  lang,
}: {
  blind: boolean;
  setBlind: Dispatch<SetStateAction<boolean>>;
  peek: boolean;
  setPeek: (v: boolean) => void;
  persistDraft: (v: string) => void;
  timerRunning: boolean;
  setTimerRunning: Dispatch<SetStateAction<boolean>>;
  timerLabel: string;
  editorPrefs: EditorPrefs;
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void;
  compact?: boolean;
  showTitle?: boolean;
  scorePct?: number;
  className?: string;
  trailing?: ReactNode;
  draftViewRef?: MutableRefObject<EditorView | null>;
  formatBothRef?: MutableRefObject<(() => void) | null>;
  foldBothRef?: MutableRefObject<{ collapse: () => void; expand: () => void } | null>;
  lang?: string;
}) {
  return (
    <div
      className={cn(
        'studio-recall-toolbar flex shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto bg-panel2/40',
        compact ? 'h-7' : 'h-8',
        className,
      )}
    >
      {showTitle && (
        <>
          <Keyboard className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className={cn('mr-0.5 shrink-0 truncate font-medium text-ink', chromeText.xs)}>Recall</span>
          <div className="mx-0.5 h-3.5 w-px shrink-0 bg-edge" />
        </>
      )}

      {/* High-frequency view toggles — kept accessible at top level */}
      <ToolbarGroup title="View mode">
        <ToolbarGroupBtn
          active={blind}
          title={blind ? 'Blind recall (⌘\\)' : 'Reference mode (⌘\\)'}
          onClick={() => setBlind((b) => !b)}
        >
          {blind ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </ToolbarGroupBtn>
        <ToolbarGroupBtn
          active={peek}
          title="Hold to peek at reference"
          onMouseDown={() => setPeek(true)}
          onMouseUp={() => setPeek(false)}
          onMouseLeave={() => setPeek(false)}
        >
          <ScanEye className="h-3 w-3" />
        </ToolbarGroupBtn>
      </ToolbarGroup>

      <ToolbarGroup title="Format">
        <ToolbarGroupBtn
          title="Format both panes — spacing, braces, indent (⌘⇧F)"
          onClick={() => formatBothRef?.current?.()}
        >
          <TextQuote className="h-3 w-3" />
        </ToolbarGroupBtn>
        <ToolbarGroupBtn
          title="Auto-select block and indent (⌘⇧I)"
          onClick={() => {
            const view = draftViewRef?.current;
            if (view) autoSelectAndIndent(view);
          }}
        >
          <AlignVerticalSpaceAround className="h-3 w-3" />
        </ToolbarGroupBtn>
        <ToolbarGroupBtn
          title="Collapse sections — funcs, types (⌘⌥[)"
          onClick={() => foldBothRef?.current?.collapse()}
        >
          <ChevronsDownUp className="h-3 w-3" />
        </ToolbarGroupBtn>
        <ToolbarGroupBtn
          title="Expand all sections (⌘⌥])"
          onClick={() => foldBothRef?.current?.expand()}
        >
          <ChevronsUpDown className="h-3 w-3" />
        </ToolbarGroupBtn>
      </ToolbarGroup>

      {/* Session + editor settings combined into one popover */}
      <RecallSettingsPopover
        timerRunning={timerRunning}
        setTimerRunning={setTimerRunning}
        timerLabel={timerLabel}
        persistDraft={persistDraft}
        editorPrefs={editorPrefs}
        setEditorPrefs={setEditorPrefs}
        compact={compact}
        draftViewRef={draftViewRef}
        formatBothRef={formatBothRef}
        foldBothRef={foldBothRef}
        lang={lang}
      />

      <div className="flex-1" />
      {scorePct !== undefined && (
        <Chip tone={scorePct >= 80 ? 'good' : scorePct >= 50 ? 'accent' : 'muted'} mono>
          {compact ? `${scorePct}%` : `${scorePct}% match`}
        </Chip>
      )}
      {trailing}
    </div>
  );
}
