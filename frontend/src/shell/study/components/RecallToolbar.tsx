import { type Dispatch, type MutableRefObject, type ReactNode, type SetStateAction } from 'react';
import type { EditorView } from '@codemirror/view';
import {
  Eye,
  EyeOff,
  Highlighter,
  Keyboard,
  Minus,
  Plus,
  RotateCcw,
  ScanEye,
  SlidersHorizontal,
  SquareTerminal,
  TextQuote,
  Timer,
} from 'lucide-react';
import {
  clampRecallFontSize,
  RECALL_FONT_MAX,
  RECALL_FONT_MIN,
} from '@/lib/editor/recallEditorTheme';
import { Chip } from '@/shell/canvas';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import type { EditorPrefs } from '@/store/user-prefs';
import {
  activeDiffToggleCount,
  diffMenuItems,
  displayMenuItems,
  displayMenuTriggerTitle,
  formatMenuItems,
  resetRecallTypography,
  sessionMenuItems,
  type RecallMenuContext,
} from './recallEditorControls';
import { RecallToolbarMenu } from './RecallToolbarMenu';
import { ToolbarGroup, ToolbarGroupBtn } from './ToolbarGroup';
import { useHoldToPeek } from '../hooks/useHoldToPeek';

function FontSizeStepper({
  fontSize,
  setEditorPrefs,
}: {
  fontSize: number;
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn('font-medium text-ink3', chromeText.xs)}>Font size</span>
      <ToolbarGroup className="shadow-none">
        <ToolbarGroupBtn
          title="Decrease font size (⌘⇧-)"
          disabled={fontSize <= RECALL_FONT_MIN}
          onClick={() => setEditorPrefs({ fontSize: clampRecallFontSize(fontSize - 1) })}
          className="h-6 w-6 px-0"
        >
          <Minus className="h-3 w-3" />
        </ToolbarGroupBtn>
        <span
          className={cn(
            'inline-flex min-w-[2.25rem] items-center justify-center border-r border-edge px-1 font-mono tabular-nums text-ink',
            chromeText.xs,
          )}
        >
          {fontSize}
        </span>
        <ToolbarGroupBtn
          title="Increase font size (⌘⇧+)"
          disabled={fontSize >= RECALL_FONT_MAX}
          onClick={() => setEditorPrefs({ fontSize: clampRecallFontSize(fontSize + 1) })}
          className="h-6 w-6 px-0"
        >
          <Plus className="h-3 w-3" />
        </ToolbarGroupBtn>
        <ToolbarGroupBtn
          title="Reset font size"
          onClick={() => resetRecallTypography(setEditorPrefs)}
          className="h-6 w-6 px-0"
        >
          <RotateCcw className="h-3 w-3" />
        </ToolbarGroupBtn>
      </ToolbarGroup>
    </div>
  );
}

/** Unified recall toolbar — view, edit, display, diff, and session controls. */
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
  center,
  draftViewRef,
  formatBothRef,
  foldBothRef,
  lang,
}: {
  blind: boolean;
  setBlind: Dispatch<SetStateAction<boolean>>;
  peek: boolean;
  setPeek: Dispatch<SetStateAction<boolean>>;
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
  /** Center the control group horizontally (standalone bar sitting on top of the editor). */
  center?: boolean;
  draftViewRef?: MutableRefObject<EditorView | null>;
  formatBothRef?: MutableRefObject<(() => void) | null>;
  foldBothRef?: MutableRefObject<{ collapse: () => void; expand: () => void } | null>;
  lang?: string;
}) {
  const peekProps = useHoldToPeek(setPeek);

  const safeScorePct =
    typeof scorePct === 'number' && Number.isFinite(scorePct)
      ? Math.max(0, Math.min(100, Math.round(scorePct)))
      : undefined;

  const menuCtx: RecallMenuContext = {
    editorPrefs,
    setEditorPrefs,
    timerRunning,
    setTimerRunning,
    timerLabel,
    persistDraft,
    ...(draftViewRef ? { draftViewRef } : {}),
    ...(formatBothRef ? { formatBothRef } : {}),
    ...(foldBothRef ? { foldBothRef } : {}),
    ...(lang !== undefined ? { lang } : {}),
  };

  const diffActiveCount = activeDiffToggleCount(editorPrefs);
  const displayActive = editorPrefs.lineHeight !== 'normal' || editorPrefs.recallCompact !== false;

  const titleNode = showTitle ? (
    <>
      <Keyboard className="h-3.5 w-3.5 shrink-0 text-accent" />
      <span className={cn('mr-0.5 shrink-0 truncate font-medium text-ink', chromeText.xs)}>
        Recall
      </span>
      <div className="recall-toolbar-divider mx-0.5 h-3.5 w-px shrink-0 bg-edge" />
    </>
  ) : null;

  const controlsNode = (
    <ToolbarGroup title="Recall editor controls">
      <ToolbarGroupBtn
        active={blind}
        aria-label={blind ? 'Blind recall on' : 'Blind recall off'}
        title={blind ? 'Blind recall (⌘\\)' : 'Reference mode (⌘\\)'}
        onClick={() => setBlind((b) => !b)}
      >
        {blind ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </ToolbarGroupBtn>
      <ToolbarGroupBtn
        active={peek}
        aria-label="Peek at reference"
        title="Hold to peek at reference (Enter/Space)"
        {...peekProps}
      >
        <ScanEye className="h-3 w-3" />
      </ToolbarGroupBtn>
      <ToolbarGroupBtn
        active={editorPrefs.vim}
        aria-label={editorPrefs.vim ? 'Vim mode on' : 'Vim mode off'}
        title={
          editorPrefs.vim ? 'Vim mode on — modal editing (⌘⌥V)' : 'Enable Vim keybindings (⌘⌥V)'
        }
        onClick={() => setEditorPrefs({ vim: !editorPrefs.vim })}
      >
        <SquareTerminal className="h-3 w-3" />
        {!compact && <span className="font-semibold">Vim</span>}
      </ToolbarGroupBtn>
      <RecallToolbarMenu
        label="Format"
        icon={<TextQuote className="h-3 w-3" />}
        items={formatMenuItems(menuCtx)}
        {...(compact !== undefined ? { compact } : {})}
      />

      <RecallToolbarMenu
        label="Display"
        icon={<SlidersHorizontal className="h-3 w-3" />}
        items={displayMenuItems(menuCtx)}
        active={displayActive}
        title={displayMenuTriggerTitle(editorPrefs)}
        {...(compact !== undefined ? { compact } : {})}
        panelWidth={260}
        header={<FontSizeStepper fontSize={editorPrefs.fontSize} setEditorPrefs={setEditorPrefs} />}
      />

      <RecallToolbarMenu
        label="Diff"
        icon={<Highlighter className="h-3 w-3" />}
        items={diffMenuItems(menuCtx)}
        active={diffActiveCount > 0}
        badge={diffActiveCount}
        {...(compact !== undefined ? { compact } : {})}
      />

      <RecallToolbarMenu
        label="Session"
        icon={<Timer className="h-3 w-3" />}
        items={sessionMenuItems(menuCtx)}
        active={timerRunning || editorPrefs.strictRecall}
        {...(compact !== undefined ? { compact } : {})}
      />
    </ToolbarGroup>
  );

  const scoreNode =
    safeScorePct !== undefined ? (
      <Chip tone={safeScorePct >= 80 ? 'good' : safeScorePct >= 50 ? 'accent' : 'muted'} mono>
        {compact ? `${safeScorePct}%` : `${safeScorePct}% match`}
      </Chip>
    ) : null;

  return (
    <div
      className={cn(
        'studio-recall-toolbar flex shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto bg-panel2/40',
        compact ? 'h-7' : 'h-8',
        className,
      )}
    >
      {center ? (
        <>
          {/* Balanced side rails keep the control group optically centered over the editor. */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5">{titleNode}</div>
          <div className="flex shrink-0 items-center gap-1.5">{controlsNode}</div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            {scoreNode}
            {trailing}
          </div>
        </>
      ) : (
        <>
          {titleNode}
          {controlsNode}
          <div className="min-w-0 flex-1" />
          {scoreNode}
          {trailing}
        </>
      )}
    </div>
  );
}
