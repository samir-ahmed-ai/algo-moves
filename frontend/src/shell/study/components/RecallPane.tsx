import { ScanEye } from 'lucide-react';
import { useRef } from 'react';
import type { EditorView } from '@codemirror/view';
import { cn } from '@/lib/utils/cn';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { useWorkspace } from '@/store/workspace';
import { EmptyState } from '@/shell/canvas';
import { useCodeStudioContent, useCodeStudioDraft, useCodeStudioEditor } from '../CodeStudio';
import { useRecallDraftHandler } from '../hooks/useRecallDraftHandler';
import { RecallEditorShell } from './RecallEditorShell';
import { RecallToolbar } from './RecallToolbar';

/** Split reference/draft diff editor — used by Learn Recall tab and Overview. */
export function RecallPane({ className, showTitle }: { className?: string; showTitle?: boolean }) {
  const { reference, code } = useCodeStudioContent();
  const {
    draft,
    score,
    blind,
    setBlind,
    peek,
    setPeek,
    persistDraft,
    timerRunning,
    setTimerRunning,
    timerLabel,
  } = useCodeStudioDraft();
  const { editorPrefs, setEditorPrefs } = useCodeStudioEditor();
  const isMobile = useIsMobile();
  const { theme, themePreset } = useWorkspace();
  const onDraftChange = useRecallDraftHandler();
  const draftViewRef = useRef<EditorView | null>(null);
  const formatBothRef = useRef<(() => void) | null>(null);
  const foldBothRef = useRef<{ collapse: () => void; expand: () => void } | null>(null);

  if (!reference) {
    return (
      <div className={cn('grid min-h-0 flex-1 place-items-center p-6', className)}>
        <EmptyState
          icon={<ScanEye className="h-4 w-4" />}
          title="No source"
          hint="This problem has no solution to recall."
        />
      </div>
    );
  }

  const compact = editorPrefs.recallCompact !== false || isMobile;

  return (
    <div
      className={cn('recall-pane-shell flex min-h-0 flex-1 flex-col overflow-hidden', className)}
    >
      <RecallToolbar
        className="border-b border-edge px-2"
        center
        {...(showTitle !== undefined ? { showTitle } : {})}
        blind={blind}
        setBlind={setBlind}
        peek={peek}
        setPeek={setPeek}
        persistDraft={persistDraft}
        timerRunning={timerRunning}
        setTimerRunning={setTimerRunning}
        timerLabel={timerLabel}
        editorPrefs={editorPrefs}
        setEditorPrefs={setEditorPrefs}
        compact={compact}
        scorePct={Math.round(score)}
        draftViewRef={draftViewRef}
        formatBothRef={formatBothRef}
        foldBothRef={foldBothRef}
        {...(code?.lang !== undefined ? { lang: code.lang } : {})}
      />
      <RecallEditorShell
        reference={reference}
        draft={draft}
        {...(code?.lang !== undefined ? { lang: code.lang } : {})}
        dark={theme === 'dark'}
        themeKey={themePreset}
        editorPrefs={editorPrefs}
        setEditorPrefs={setEditorPrefs}
        blind={blind}
        peek={peek}
        onDraftChange={onDraftChange}
        compact={compact}
        draftViewRef={draftViewRef}
        formatBothRef={formatBothRef}
        foldBothRef={foldBothRef}
      />
    </div>
  );
}
