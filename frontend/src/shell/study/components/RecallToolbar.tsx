import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Eye, EyeOff, Keyboard, RotateCcw, ScanEye, Timer } from 'lucide-react';
import { Chip } from '@/shell/canvas';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import type { EditorPrefs } from '@/store/user-prefs';
import { RecallEditorMenu } from './RecallEditorMenu';
import { recallEditorMenuItems } from './recallEditorControls';
import { ToolbarGroup, ToolbarGroupBtn } from './ToolbarGroup';

/** Compact grouped recall controls — shared by RecallPane and Code Studio header. */
export function RecallToolbar({
  blind,
  setBlind,
  peek,
  setPeek,
  persistDraft,
  attemptCount = 0,
  timerRunning,
  setTimerRunning,
  timerLabel,
  editorPrefs,
  setEditorPrefs,
  compact,
  showTitle,
  scorePct,
  linesProgress,
  className,
  trailing,
}: {
  blind: boolean;
  setBlind: Dispatch<SetStateAction<boolean>>;
  peek: boolean;
  setPeek: (v: boolean) => void;
  persistDraft: (v: string) => void;
  /** Saved recall attempts for this problem (incremented on each mistake). */
  attemptCount?: number;
  timerRunning: boolean;
  setTimerRunning: Dispatch<SetStateAction<boolean>>;
  timerLabel: string;
  editorPrefs: EditorPrefs;
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void;
  compact?: boolean;
  showTitle?: boolean;
  scorePct?: number;
  /** Lines fully recalled so far, out of the total non-blank reference lines. */
  linesProgress?: { completed: number; total: number };
  className?: string;
  trailing?: ReactNode;
}) {
  const editorMenuItems = recallEditorMenuItems(editorPrefs, setEditorPrefs);
  const currentAttempt = attemptCount + 1;

  return (
    <div
      className={cn(
        'flex shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto',
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

      <ToolbarGroup title="Session">
        <ToolbarGroupBtn title="Clear attempt (⌘⇧R)" onClick={() => persistDraft('')}>
          <RotateCcw className="h-3 w-3" />
        </ToolbarGroupBtn>
        <ToolbarGroupBtn
          active={timerRunning}
          title={timerRunning ? 'Stop recall timer' : 'Start recall timer'}
          onClick={() => setTimerRunning((r) => !r)}
        >
          <Timer className="h-3 w-3" />
          {!compact && <span className="max-w-[3.5rem] truncate">{timerLabel}</span>}
        </ToolbarGroupBtn>
      </ToolbarGroup>

      <RecallEditorMenu items={editorMenuItems} compact title="Recall editor settings" />

      <div className="flex-1" />
      {attemptCount > 0 && (
        <Chip tone="muted" mono title={`${attemptCount} failed attempt${attemptCount === 1 ? '' : 's'} saved`}>
          Attempt {currentAttempt}
        </Chip>
      )}
      {linesProgress !== undefined && linesProgress.total > 0 && (
        <Chip tone={linesProgress.completed >= linesProgress.total ? 'good' : 'muted'} mono>
          {linesProgress.completed}/{linesProgress.total}
          {!compact && ' lines'}
        </Chip>
      )}
      {scorePct !== undefined && (
        <Chip tone={scorePct >= 80 ? 'good' : scorePct >= 50 ? 'accent' : 'muted'} mono>
          {compact ? `${scorePct}%` : `${scorePct}% match`}
        </Chip>
      )}
      {trailing}
    </div>
  );
}
