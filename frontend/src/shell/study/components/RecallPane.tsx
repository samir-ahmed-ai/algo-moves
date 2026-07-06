import { Eye, EyeOff, Keyboard, RotateCcw, ScanEye, Timer } from 'lucide-react';
import { SplitCodeEditor } from '@/components/code/SplitCodeEditor';
import { cn } from '@/lib/utils/cn';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { useWorkspace } from '@/store/workspace';
import { Btn, Chip, EmptyState } from '@/shell/canvas';
import { chromeText } from '@/shell/chromeUi';
import {
  useCodeStudioContent,
  useCodeStudioDraft,
  useCodeStudioEditor,
} from '../CodeStudio';

/** Split reference/draft editor with recall toolbar — used by Learn Recall tab and Overview. */
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
    skeleton,
    timerRunning,
    setTimerRunning,
    timerLabel,
  } = useCodeStudioDraft();
  const { editorPrefs, setEditorPrefs } = useCodeStudioEditor();
  const isMobile = useIsMobile();
  const { theme, themePreset } = useWorkspace();

  if (!reference) {
    return (
      <div className={cn('grid min-h-0 flex-1 place-items-center p-6', className)}>
        <EmptyState icon={<ScanEye className="h-4 w-4" />} title="No source" hint="This problem has no solution to recall." />
      </div>
    );
  }

  const pct = Math.round(score);
  const blindTitle = blind ? 'Blind recall' : 'Reference mode';

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
      <div className="flex h-9 shrink-0 flex-nowrap items-center gap-1 overflow-x-auto border-b border-edge px-3">
        {showTitle && (
          <>
            <Keyboard className="h-4 w-4 shrink-0 text-accent" />
            <span className={cn('mr-1 shrink-0 truncate font-medium text-ink', chromeText.sm)}>Recall</span>
            <div className="mx-1 h-4 w-px shrink-0 bg-edge" />
          </>
        )}
        <Btn
          size="xs"
          variant={blind ? 'primary' : 'ghost'}
          icon={blind ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          title={blindTitle}
          onClick={() => setBlind((b) => !b)}
        >
          {isMobile ? null : blind ? 'Blind' : 'Reference'}
        </Btn>
        <Btn
          size="xs"
          variant="ghost"
          icon={<ScanEye className="h-3.5 w-3.5" />}
          title="Hold to peek at reference"
          onMouseDown={() => setPeek(true)}
          onMouseUp={() => setPeek(false)}
          onMouseLeave={() => setPeek(false)}
        >
          {isMobile ? null : 'Peek'}
        </Btn>
        <Btn
          size="xs"
          variant="ghost"
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          title="Reset to skeleton"
          onClick={() => persistDraft(skeleton)}
        >
          {isMobile ? null : 'Reset'}
        </Btn>
        <Btn
          size="xs"
          variant={timerRunning ? 'good' : 'ghost'}
          icon={<Timer className="h-3.5 w-3.5" />}
          title={timerRunning ? 'Stop recall timer' : 'Start recall timer'}
          onClick={() => setTimerRunning((r) => !r)}
        >
          {isMobile ? null : timerLabel}
        </Btn>
        <div className="flex-1" />
        <Chip tone={pct >= 80 ? 'good' : pct >= 50 ? 'accent' : 'muted'} mono>
          {isMobile ? `${pct}%` : `${pct}% match`}
        </Chip>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <SplitCodeEditor
          reference={reference}
          draft={draft}
          lang={code?.lang}
          dark={theme === 'dark'}
          themeKey={themePreset}
          vim={editorPrefs.vim}
          wrap={editorPrefs.wrap}
          hideLeft={blind}
          peekLeft={peek}
          splitPct={editorPrefs.splitPct}
          onSplitPctChange={(splitPct) => setEditorPrefs({ splitPct })}
          onDraftChange={persistDraft}
        />
      </div>
    </div>
  );
}
