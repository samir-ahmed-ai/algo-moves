import { useEffect } from 'react';
import { AlertTriangle, Crown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { DojoGameChrome } from '@/shell/dojo/ui/DojoGameChrome';
import { DojoBadge, DojoKbd } from '@/shell/dojo/ui/shared';
import { LEVEL_IDS } from './engine/queens';
import { BacktrackGameProvider, useBacktrackGame } from './BacktrackGameProvider';
import { QueensBoard } from './ui/QueensBoard';
import { LevelStrip } from './ui/LevelStrip';
import { IntroCard } from './ui/IntroCard';
import { CompleteCard } from './ui/CompleteCard';
import { TouchPad } from './ui/TouchPad';

function useGameKeyboard() {
  const { handleKey } = useBacktrackGame();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (handleKey(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKey]);
}

function DeadEndBanner() {
  const { deadEnd } = useBacktrackGame();

  return (
    <div className="flex h-10 items-center">
      {deadEnd ? (
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-bad/30 bg-badbg px-3 py-1.5 text-sm font-medium text-bad">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Dead end — every column is attacked. Backtrack with{' '}
            <DojoKbd className="mx-0.5">u</DojoKbd>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function StatusBar() {
  const { level, actions, message, error, showHint } = useBacktrackGame();

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap items-center justify-center gap-1.5 tabular-nums">
        <DojoBadge tone="accent">{actions} actions</DojoBadge>
        <DojoBadge tone="muted">par {level.par}</DojoBadge>
        {showHint ? <DojoBadge tone="good">hints on</DojoBadge> : null}
      </div>
      <p
        className={cn(
          'min-h-[1.25rem] max-w-md text-center text-sm',
          error ? 'text-bad' : 'text-ink2',
        )}
        role="status"
      >
        {message ?? (showHint ? 'Green-ringed squares are safe in the open row.' : '')}
      </p>
    </div>
  );
}

function BacktrackDojoPageBody() {
  const { completedCount } = useBacktrackGame();
  useGameKeyboard();

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <DojoGameChrome
        icon={Crown}
        title="Queens Court"
        completedCount={completedCount}
        levelCount={LEVEL_IDS.length}
      />
      <div className="flex justify-center px-3 pb-1 pt-16 min-[720px]:pt-3">
        <LevelStrip />
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-3 pb-3">
        <DeadEndBanner />
        <QueensBoard />
        <StatusBar />
      </div>
      <IntroCard />
      <CompleteCard />
      <TouchPad />
    </div>
  );
}

export function BacktrackDojoPage() {
  return (
    <BacktrackGameProvider>
      <BacktrackDojoPageBody />
    </BacktrackGameProvider>
  );
}
