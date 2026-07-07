import type { ReactNode } from 'react';
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
  SplitSquareHorizontal,
  SquareTerminal,
  TextQuote,
  WrapText,
} from 'lucide-react';
import { alignSelection, autoSelectAndIndent, formatDocument } from '@/lib/editor/codeFormat';
import { collapseSections, expandSections } from '@/lib/editor/codeFold';
import { recallLineHeightLabel } from '@/lib/editor/recallEditorTheme';
import type { PanelHeaderMenuItem } from '@/shell/canvas';
import type { EditorPrefs } from '@/store/user-prefs';

export type RecallEditorMenuItem = PanelHeaderMenuItem & { active?: boolean };

const MENU_ICON_CLASS = 'recall-menu-icon h-3.5 w-3.5';

/** Overflow menu entries for merge diff editor toggles (shared by RecallPane + CodeStudio header). */
export function recallEditorMenuItems(
  editorPrefs: EditorPrefs,
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void,
  draftView?: EditorView | null,
  formatBoth?: (() => void) | null,
  foldBoth?: { collapse: () => void; expand: () => void } | null,
  lang?: string,
): RecallEditorMenuItem[] {
  return [
    {
      label: editorPrefs.vim ? 'Disable Vim keybindings' : 'Enable Vim keybindings',
      icon: <SquareTerminal className={MENU_ICON_CLASS} />,
      active: editorPrefs.vim,
      onClick: () => setEditorPrefs({ vim: !editorPrefs.vim }),
    },
    {
      label: 'Format both panes (spacing + braces)',
      icon: <TextQuote className={MENU_ICON_CLASS} />,
      onClick: () => {
        if (formatBoth) formatBoth();
        else if (draftView) formatDocument(draftView);
      },
    },
    {
      label: 'Collapse sections',
      icon: <ChevronsDownUp className={MENU_ICON_CLASS} />,
      onClick: () => {
        if (foldBoth) foldBoth.collapse();
        else if (draftView) collapseSections(draftView, lang);
      },
    },
    {
      label: 'Expand all sections',
      icon: <ChevronsUpDown className={MENU_ICON_CLASS} />,
      onClick: () => {
        if (foldBoth) foldBoth.expand();
        else if (draftView) expandSections(draftView);
      },
    },
    {
      label: 'Auto-select and indent',
      icon: <AlignVerticalSpaceAround className={MENU_ICON_CLASS} />,
      onClick: () => {
        if (draftView) autoSelectAndIndent(draftView);
      },
    },
    {
      label: 'Align selection on =',
      icon: <AlignCenterHorizontal className={MENU_ICON_CLASS} />,
      onClick: () => {
        if (draftView) alignSelection(draftView);
      },
    },
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
      label: `Line height: ${recallLineHeightLabel(editorPrefs.lineHeight)}`,
      icon: <AlignVerticalSpaceAround className={MENU_ICON_CLASS} />,
      onClick: () =>
        setEditorPrefs({
          lineHeight:
            editorPrefs.lineHeight === 'compact'
              ? 'normal'
              : editorPrefs.lineHeight === 'normal'
                ? 'relaxed'
                : 'compact',
        }),
    },
    {
      label: 'Reset split to 50/50',
      icon: <SplitSquareHorizontal className={MENU_ICON_CLASS} />,
      onClick: () => setEditorPrefs({ splitPct: 50 }),
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

export function recallEditorToggleLabel(
  key: 'wrap' | 'mergeGutter' | 'mergeCollapse' | 'recallCompact',
  editorPrefs: EditorPrefs,
): string {
  switch (key) {
    case 'wrap':
      return editorPrefs.wrap ? 'Wrap' : 'No wrap';
    case 'mergeGutter':
      return editorPrefs.mergeGutter ? 'Gutter' : 'No gutter';
    case 'mergeCollapse':
      return editorPrefs.mergeCollapse ? 'Collapse' : 'Expand all';
    case 'recallCompact':
      return editorPrefs.recallCompact !== false ? 'Compact' : 'Spacious';
  }
}

export function recallEditorToggleIcon(key: 'wrap' | 'mergeGutter' | 'mergeCollapse'): ReactNode {
  const cls = 'h-3.5 w-3.5';
  switch (key) {
    case 'wrap':
      return <WrapText className={cls} />;
    case 'mergeGutter':
      return <Columns2 className={cls} />;
    case 'mergeCollapse':
      return <ChevronsDownUp className={cls} />;
  }
}
