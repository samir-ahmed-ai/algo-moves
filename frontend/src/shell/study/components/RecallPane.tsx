import { ScanEye } from 'lucide-react';
import { computeRecallProgress } from '@/lib/code';
import { cn } from '@/lib/utils/cn';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { useWorkspace } from '@/store/workspace';
import { EmptyState } from '@/shell/canvas';
import {
  useCodeStudioContent,
  useCodeStudioDraft,
  useCodeStudioEditor,
} from '../CodeStudio';
import { useRecallDraftChange } from '../hooks/useRecallDraftChange';
import { RecallEditorShell } from './RecallEditorShell';
import { RecallToolbar } from './RecallToolbar';

/** Split reference/draft editor with recall toolbar — used by Learn Recall tab and Overview. */
export function RecallPane({ className, showTitle }: { className?: string; showTitle?: boolean }) {
  const { reference, code, stat } = useCodeStudioContent();
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
  const { onDraftChange: recallDraftChange, mistakeTick } = useRecallDraftChange();
  const isMobile = useIsMobile();
  const { theme, themePreset } = useWorkspace();

  if (!reference) {
    return (
      <div className={cn('grid min-h-0 flex-1 place-items-center p-6', className)}>
        <EmptyState icon={<ScanEye className="h-4 w-4" />} title="No source" hint="This problem has no solution to recall." />
      </div>
    );
  }

  const compact = editorPrefs.recallCompact || isMobile;
  const progress = computeRecallProgress(reference, draft);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
      <RecallToolbar
        className="border-b border-edge px-2"
        showTitle={showTitle}
        blind={blind}
        setBlind={setBlind}
        peek={peek}
        setPeek={setPeek}
        persistDraft={persistDraft}
        attemptCount={stat.attempts}
        timerRunning={timerRunning}
        setTimerRunning={setTimerRunning}
        timerLabel={timerLabel}
        editorPrefs={editorPrefs}
        setEditorPrefs={setEditorPrefs}
        compact={compact}
        scorePct={Math.round(score)}
        linesProgress={{ completed: progress.completedLines.length, total: progress.total }}
      />
      <RecallEditorShell
        reference={reference}
        draft={draft}
        lang={code?.lang}
        dark={theme === 'dark'}
        themeKey={themePreset}
        editorPrefs={editorPrefs}
        setEditorPrefs={setEditorPrefs}
        blind={blind}
        peek={peek}
        onDraftChange={recallDraftChange}
        compact={compact}
        mistakeTick={mistakeTick}
      />
    </div>
  );
}
