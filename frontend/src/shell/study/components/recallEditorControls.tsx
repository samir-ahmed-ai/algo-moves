import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { EditorView } from '@codemirror/view';
import {
  AlignCenterHorizontal,
  AlignVerticalSpaceAround,
  ChevronsDownUp,
  ChevronsUpDown,
  Columns2,
  Hash,
  Highlighter,
  Minimize2,
  RotateCcw,
  SplitSquareHorizontal,
  Target,
  TextQuote,
  Timer,
  WrapText,
} from 'lucide-react';
import { alignSelection, autoSelectAndIndent, formatDocument } from '@/lib/editor/codeFormat';
import { collapseSections, expandSections } from '@/lib/editor/codeFold';
import {
  cycleRecallLineHeight,
  recallLineHeightLabel,
  RECALL_FONT_DEFAULT,
} from '@/lib/editor/recallEditorTheme';
import type { PanelHeaderMenuItem } from '@/shell/canvas';
import type { EditorPrefs } from '@/store/user-prefs';

export type RecallEditorMenuItem = PanelHeaderMenuItem & { active?: boolean };

const MENU_ICON_CLASS = 'recall-menu-icon h-3.5 w-3.5';

export type RecallMenuContext = {
  editorPrefs: EditorPrefs;
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void;
  draftViewRef?: MutableRefObject<EditorView | null>;
  formatBothRef?: MutableRefObject<(() => void) | null>;
  foldBothRef?: MutableRefObject<{ collapse: () => void; expand: () => void } | null>;
  lang?: string;
  timerRunning?: boolean;
  setTimerRunning?: Dispatch<SetStateAction<boolean>>;
  timerLabel?: string;
  persistDraft?: (v: string) => void;
};

function draftView(ctx: RecallMenuContext): EditorView | null {
  return ctx.draftViewRef?.current ?? null;
}

/** Format + fold actions for the Format dropdown. */
export function formatMenuItems(ctx: RecallMenuContext): RecallEditorMenuItem[] {
  const { formatBothRef, foldBothRef, lang } = ctx;
  return [
    {
      label: 'Format both panes (⌘⇧F)',
      icon: <TextQuote className={MENU_ICON_CLASS} />,
      onClick: () => {
        const formatBoth = formatBothRef?.current;
        const view = draftView(ctx);
        if (formatBoth) formatBoth();
        else if (view) formatDocument(view);
      },
    },
    {
      label: 'Auto-select and indent (⌘⇧I)',
      icon: <AlignVerticalSpaceAround className={MENU_ICON_CLASS} />,
      onClick: () => {
        const view = draftView(ctx);
        if (view) autoSelectAndIndent(view);
      },
    },
    {
      label: 'Align selection on = (⌘⌥A)',
      icon: <AlignCenterHorizontal className={MENU_ICON_CLASS} />,
      onClick: () => {
        const view = draftView(ctx);
        if (view) alignSelection(view);
      },
    },
    {
      label: 'Collapse sections (⌘⌥[)',
      icon: <ChevronsDownUp className={MENU_ICON_CLASS} />,
      onClick: () => {
        const foldBoth = foldBothRef?.current;
        const view = draftView(ctx);
        if (foldBoth) foldBoth.collapse();
        else if (view) collapseSections(view, lang);
      },
    },
    {
      label: 'Expand all sections (⌘⌥])',
      icon: <ChevronsUpDown className={MENU_ICON_CLASS} />,
      onClick: () => {
        const foldBoth = foldBothRef?.current;
        const view = draftView(ctx);
        if (foldBoth) foldBoth.expand();
        else if (view) expandSections(view);
      },
    },
  ];
}

/** Typography + chrome density for the Display dropdown. */
export function displayMenuItems(ctx: RecallMenuContext): RecallEditorMenuItem[] {
  const { editorPrefs, setEditorPrefs } = ctx;
  return [
    {
      label: `Line height: ${recallLineHeightLabel(editorPrefs.lineHeight)}`,
      icon: <AlignVerticalSpaceAround className={MENU_ICON_CLASS} />,
      active: editorPrefs.lineHeight !== 'normal',
      onClick: () =>
        setEditorPrefs({
          lineHeight: cycleRecallLineHeight(editorPrefs.lineHeight),
        }),
    },
    {
      label:
        editorPrefs.recallCompact !== false ? 'Spacious editor chrome' : 'Compact editor chrome',
      icon: <Minimize2 className={MENU_ICON_CLASS} />,
      active: editorPrefs.recallCompact !== false,
      onClick: () =>
        setEditorPrefs({ recallCompact: editorPrefs.recallCompact !== false ? false : true }),
    },
  ];
}

/** Diff view toggles for the Diff dropdown. */
export function diffMenuItems(ctx: RecallMenuContext): RecallEditorMenuItem[] {
  const { editorPrefs, setEditorPrefs } = ctx;
  return [
    {
      label: editorPrefs.wrap ? 'Disable soft-wrap' : 'Enable soft-wrap',
      icon: <WrapText className={MENU_ICON_CLASS} />,
      active: editorPrefs.wrap,
      onClick: () => setEditorPrefs({ wrap: !editorPrefs.wrap }),
    },
    {
      label: editorPrefs.highlightChanges ? 'Hide change highlights' : 'Show change highlights',
      icon: <Highlighter className={MENU_ICON_CLASS} />,
      active: editorPrefs.highlightChanges,
      onClick: () => setEditorPrefs({ highlightChanges: !editorPrefs.highlightChanges }),
    },
    {
      label: editorPrefs.mergeGutter ? 'Hide change gutter' : 'Show change gutter',
      icon: <Columns2 className={MENU_ICON_CLASS} />,
      active: editorPrefs.mergeGutter,
      onClick: () => setEditorPrefs({ mergeGutter: !editorPrefs.mergeGutter }),
    },
    {
      label: editorPrefs.mergeCollapse ? 'Show all lines' : 'Collapse unchanged',
      icon: <ChevronsDownUp className={MENU_ICON_CLASS} />,
      active: editorPrefs.mergeCollapse,
      onClick: () => setEditorPrefs({ mergeCollapse: !editorPrefs.mergeCollapse }),
    },
    {
      label: editorPrefs.showLineNumbers ? 'Hide line numbers' : 'Show line numbers',
      icon: <Hash className={MENU_ICON_CLASS} />,
      active: editorPrefs.showLineNumbers,
      onClick: () => setEditorPrefs({ showLineNumbers: !editorPrefs.showLineNumbers }),
    },
    {
      label: 'Reset split to 50/50',
      icon: <SplitSquareHorizontal className={MENU_ICON_CLASS} />,
      onClick: () => setEditorPrefs({ splitPct: 50 }),
    },
  ];
}

/** Session controls for the Session dropdown. */
export function sessionMenuItems(ctx: RecallMenuContext): RecallEditorMenuItem[] {
  const { editorPrefs, setEditorPrefs, timerRunning, setTimerRunning, timerLabel, persistDraft } =
    ctx;
  const items: RecallEditorMenuItem[] = [];

  items.push({
    label: editorPrefs.strictRecall
      ? 'Strict recall: on — resets on mistake'
      : 'Strict recall: reset on mistake',
    icon: <Target className={MENU_ICON_CLASS} />,
    active: editorPrefs.strictRecall,
    onClick: () => setEditorPrefs({ strictRecall: !editorPrefs.strictRecall }),
  });

  if (setTimerRunning) {
    items.push({
      label: timerRunning ? `Stop timer (${timerLabel ?? ''})` : 'Start timer',
      icon: <Timer className={MENU_ICON_CLASS} />,
      ...(timerRunning ? { active: true } : {}),
      onClick: () => setTimerRunning((r: boolean) => !r),
    });
  }

  if (persistDraft) {
    items.push({
      label: 'Clear draft (⌘⇧R)',
      icon: <RotateCcw className={MENU_ICON_CLASS} />,
      onClick: () => persistDraft(''),
    });
  }

  return items;
}

/** Count of active diff toggles (for dropdown badge). */
export function activeDiffToggleCount(editorPrefs: EditorPrefs): number {
  let count = 0;
  if (editorPrefs.wrap) count++;
  if (editorPrefs.highlightChanges) count++;
  if (editorPrefs.mergeGutter) count++;
  if (editorPrefs.mergeCollapse) count++;
  if (editorPrefs.showLineNumbers) count++;
  return count;
}

/** Title for the Display dropdown trigger — font size + line height. */
export function displayMenuTriggerTitle(editorPrefs: EditorPrefs): string {
  return `Display — ${editorPrefs.fontSize}px, ${recallLineHeightLabel(editorPrefs.lineHeight)} line height`;
}

/** Reset font + line height to defaults. */
export function resetRecallTypography(setEditorPrefs: (patch: Partial<EditorPrefs>) => void): void {
  setEditorPrefs({ fontSize: RECALL_FONT_DEFAULT, lineHeight: 'normal' });
}
