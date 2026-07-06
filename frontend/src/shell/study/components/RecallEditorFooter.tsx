import {
  AlignVerticalSpaceAround,
  ChevronsDownUp,
  Columns2,
  Crosshair,
  Eye,
  EyeOff,
  GitCompareArrows,
  Hash,
  Highlighter,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
  SplitSquareHorizontal,
  Target,
  WrapText,
} from 'lucide-react';
import {
  clampRecallFontSize,
  cycleRecallLineHeight,
  recallLineHeightLabel,
  RECALL_FONT_DEFAULT,
  RECALL_FONT_MAX,
  RECALL_FONT_MIN,
} from '@/lib/editor/recallEditorTheme';
import { cycleRecallReveal, recallRevealLabel } from '@/lib/editor/recallProgress';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import type { EditorPrefs } from '@/store/user-prefs';
import { ToolbarGroup, ToolbarGroupBtn } from './ToolbarGroup';

/** Font + editor feature controls below the recall merge editor. */
export function RecallEditorFooter({
  editorPrefs,
  setEditorPrefs,
  compact,
}: {
  editorPrefs: EditorPrefs;
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void;
  compact?: boolean;
}) {
  const pointerMode = editorPrefs.pointerMode;

  const toggle = (
    key: keyof Pick<
      EditorPrefs,
      'wrap' | 'mergeGutter' | 'mergeCollapse' | 'showLineNumbers' | 'showPointer' | 'highlightChanges'
    >,
    icon: React.ReactNode,
    title: string,
  ) => (
    <ToolbarGroupBtn
      key={key}
      active={editorPrefs[key]}
      title={title}
      aria-pressed={editorPrefs[key]}
      onClick={() => setEditorPrefs({ [key]: !editorPrefs[key] })}
    >
      {icon}
    </ToolbarGroupBtn>
  );

  return (
    <div
      className={cn(
        'nodrag flex shrink-0 flex-wrap items-center gap-1.5 border-t border-edge bg-panel2/60 px-2',
        compact ? 'min-h-7 py-0.5' : 'min-h-8 py-1',
      )}
    >
      <ToolbarGroup title="Font size">
        <ToolbarGroupBtn
          title="Decrease font size"
          disabled={editorPrefs.fontSize <= RECALL_FONT_MIN}
          onClick={() => setEditorPrefs({ fontSize: clampRecallFontSize(editorPrefs.fontSize - 1) })}
        >
          <Minus className="h-3 w-3" />
        </ToolbarGroupBtn>
        <span
          className={cn(
            'inline-flex min-w-[2.25rem] items-center justify-center border-r border-edge px-1 font-mono tabular-nums text-ink2',
            chromeText.xs,
          )}
        >
          {editorPrefs.fontSize}
        </span>
        <ToolbarGroupBtn
          title="Increase font size"
          disabled={editorPrefs.fontSize >= RECALL_FONT_MAX}
          onClick={() => setEditorPrefs({ fontSize: clampRecallFontSize(editorPrefs.fontSize + 1) })}
        >
          <Plus className="h-3 w-3" />
        </ToolbarGroupBtn>
        <ToolbarGroupBtn
          title="Reset font size"
          onClick={() => setEditorPrefs({ fontSize: RECALL_FONT_DEFAULT, lineHeight: 'normal' })}
        >
          <RotateCcw className="h-3 w-3" />
        </ToolbarGroupBtn>
      </ToolbarGroup>

      <ToolbarGroup title="Line height">
        <ToolbarGroupBtn
          active={editorPrefs.lineHeight !== 'normal'}
          title={`Line height: ${recallLineHeightLabel(editorPrefs.lineHeight)} — click to cycle`}
          onClick={() => setEditorPrefs({ lineHeight: cycleRecallLineHeight(editorPrefs.lineHeight) })}
        >
          <AlignVerticalSpaceAround className="h-3 w-3" />
          {!compact && (
            <span className="max-w-[3rem] truncate">{recallLineHeightLabel(editorPrefs.lineHeight)}</span>
          )}
        </ToolbarGroupBtn>
      </ToolbarGroup>

      <ToolbarGroup title="Reveal ahead">
        <ToolbarGroupBtn
          active={editorPrefs.recallReveal !== 'full'}
          title={`Reveal ahead: ${recallRevealLabel(editorPrefs.recallReveal)} — click to cycle (⌘⇧.)`}
          onClick={() => setEditorPrefs({ recallReveal: cycleRecallReveal(editorPrefs.recallReveal) })}
        >
          {editorPrefs.recallReveal === 'full' ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
          {!compact && <span className="max-w-[3.5rem] truncate">{recallRevealLabel(editorPrefs.recallReveal)}</span>}
        </ToolbarGroupBtn>
      </ToolbarGroup>

      <ToolbarGroup title="Editor features">
        {toggle('wrap', <WrapText className="h-3 w-3" />, 'Soft-wrap lines')}
        {toggle('highlightChanges', <Highlighter className="h-3 w-3" />, 'Highlight changes')}
        {toggle('mergeGutter', <Columns2 className="h-3 w-3" />, 'Change gutter')}
        {toggle('mergeCollapse', <ChevronsDownUp className="h-3 w-3" />, 'Collapse unchanged')}
        {toggle('showLineNumbers', <Hash className="h-3 w-3" />, 'Line numbers')}
        {toggle('showPointer', <Target className="h-3 w-3" />, 'Pointer highlight')}
        <ToolbarGroupBtn
          active={pointerMode === 'diff'}
          title={pointerMode === 'diff' ? 'Diff-aligned pointer' : 'Line-mirror pointer'}
          onClick={() => setEditorPrefs({ pointerMode: pointerMode === 'diff' ? 'line' : 'diff' })}
        >
          {pointerMode === 'diff' ? <GitCompareArrows className="h-3 w-3" /> : <Crosshair className="h-3 w-3" />}
        </ToolbarGroupBtn>
        <ToolbarGroupBtn
          title="Reset split to 50/50"
          onClick={() => setEditorPrefs({ splitPct: 50 })}
        >
          <SplitSquareHorizontal className="h-3 w-3" />
        </ToolbarGroupBtn>
        <ToolbarGroupBtn
          active={editorPrefs.recallCompact}
          title="Compact recall toolbar"
          onClick={() => setEditorPrefs({ recallCompact: !editorPrefs.recallCompact })}
        >
          <Minimize2 className="h-3 w-3" />
        </ToolbarGroupBtn>
      </ToolbarGroup>
    </div>
  );
}
