import { useEffect } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { DojoGameChrome } from '@/shell/dojo/ui/DojoGameChrome';
import { DojoBadge } from '@/shell/dojo/ui/shared';
import { LEVEL_IDS } from './engine/pincer';
import { PincerGameProvider, usePincerGame } from './PincerGameProvider';
import { PincerBoard } from './ui/PincerBoard';
import { LevelStrip } from './ui/LevelStrip';
import { IntroCard } from './ui/IntroCard';
import { CompleteCard } from './ui/CompleteCard';
import { TouchPad } from './ui/TouchPad';

function useGameKeyboard() {
  const { handleKey } = usePincerGame();

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

function StatusBar() {
  const { level, actions, message, error } = usePincerGame();

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap items-center justify-center gap-1.5 tabular-nums">
        <DojoBadge tone="accent">{actions} actions</DojoBadge>
        <DojoBadge tone="muted">par {level.par}</DojoBadge>
      </div>
      <p
        className={cn(
          'min-h-[2.5rem] max-w-xl px-2 text-center text-sm',
          error ? 'text-bad' : 'text-ink2',
        )}
        role="status"
      >
        {message ?? ''}
      </p>
    </div>
  );
}

function TwoPointersDojoPageBody() {
  const { completedCount } = usePincerGame();
  useGameKeyboard();

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <DojoGameChrome
        icon={ArrowLeftRight}
        title="Pincer"
        completedCount={completedCount}
        levelCount={LEVEL_IDS.length}
      />
      <div className="flex justify-center px-3 pb-1 pt-16 min-[720px]:pt-3">
        <LevelStrip />
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-3 pb-3">
        <PincerBoard />
        <StatusBar />
      </div>
      <IntroCard />
      <CompleteCard />
      <TouchPad />
    </div>
  );
}

export function TwoPointersDojoPage() {
  return (
    <PincerGameProvider>
      <TwoPointersDojoPageBody />
    </PincerGameProvider>
  );
}
