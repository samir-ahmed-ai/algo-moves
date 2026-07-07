import { useRef, type MutableRefObject } from 'react';
import type { EditorView } from '@codemirror/view';
import { SplitCodeEditor } from '@/components/code/SplitCodeEditor';
import type { EditorPrefs } from '@/store/user-prefs';

/** Split merge diff editor — shared by RecallPane and Code Studio body. */
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
  draftViewRef,
  formatBothRef,
  foldBothRef,
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
  draftViewRef?: MutableRefObject<EditorView | null>;
  formatBothRef?: MutableRefObject<(() => void) | null>;
  foldBothRef?: MutableRefObject<{ collapse: () => void; expand: () => void } | null>;
}) {
  const localDraftRef = useRef<EditorView | null>(null);
  const localFormatBothRef = useRef<(() => void) | null>(null);
  const localFoldBothRef = useRef<{ collapse: () => void; expand: () => void } | null>(null);
  const viewRef = draftViewRef ?? localDraftRef;
  const formatRef = formatBothRef ?? localFormatBothRef;
  const foldRef = foldBothRef ?? localFoldBothRef;

  return (
    <div className="recall-editor-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <SplitCodeEditor
        reference={reference}
        draft={draft}
        {...(lang ? { lang } : {})}
        {...(dark !== undefined ? { dark } : {})}
        {...(themeKey ? { themeKey } : {})}
        vim={editorPrefs.vim}
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
        {...(compact !== undefined ? { compact } : {})}
        draftViewRef={viewRef}
        formatBothRef={formatRef}
        foldBothRef={foldRef}
      />
    </div>
  );
}
