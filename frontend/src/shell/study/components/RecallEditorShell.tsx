import { SplitCodeEditor } from '@/components/code/SplitCodeEditor';
import type { EditorPrefs } from '@/store/user-prefs';
import { RecallEditorFooter } from './RecallEditorFooter';

/** Split merge diff editor + footer controls — shared by RecallPane and Code Studio body. */
export function RecallEditorShell({
  reference,
  draft,
  lang,
  dark,
  themeKey,
  editorPrefs,
  setEditorPrefs,
  blind,
  peek,
  onDraftChange,
  compact,
}: {
  reference: string;
  draft: string;
  lang?: string;
  dark?: boolean;
  themeKey?: string;
  editorPrefs: EditorPrefs;
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void;
  blind: boolean;
  peek: boolean;
  onDraftChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SplitCodeEditor
        reference={reference}
        draft={draft}
        lang={lang}
        dark={dark}
        themeKey={themeKey}
        vim={true}
        wrap={editorPrefs.wrap}
        hideLeft={blind}
        peekLeft={peek}
        splitPct={editorPrefs.splitPct}
        onSplitPctChange={(splitPct) => setEditorPrefs({ splitPct })}
        onDraftChange={onDraftChange}
        mergeGutter={editorPrefs.mergeGutter}
        mergeCollapse={editorPrefs.mergeCollapse}
        highlightChanges={editorPrefs.highlightChanges}
        showLineNumbers={editorPrefs.showLineNumbers}
        fontSize={editorPrefs.fontSize}
        lineHeight={editorPrefs.lineHeight}
        compact={compact}
      />
      <RecallEditorFooter editorPrefs={editorPrefs} setEditorPrefs={setEditorPrefs} compact={compact} />
    </div>
  );
}
