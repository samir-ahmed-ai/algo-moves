import { useEffect } from 'react';
import { Link2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { DojoGameChrome } from '@/shell/dojo/ui/DojoGameChrome';
import { DojoBadge } from '@/shell/dojo/ui/shared';
import { LEVEL_IDS } from './engine/dsu';
import { BridgeGameProvider, useBridgeGame } from './BridgeGameProvider';
import { HarborBoard } from './ui/HarborBoard';
import { LevelStrip } from './ui/LevelStrip';
import { IntroCard } from './ui/IntroCard';
import { CompleteCard } from './ui/CompleteCard';
import { TouchPad } from './ui/TouchPad';

function useGameKeyboard() {
  const { handleKey } = useBridgeGame();

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
  const { level, actions, opIndex, message, error } = useBridgeGame();

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap items-center justify-center gap-1.5 tabular-nums">
        <DojoBadge tone="accent">{actions} actions</DojoBadge>
        <DojoBadge tone="muted">par {level.par}</DojoBadge>
        <DojoBadge tone="muted">
          op {Math.min(opIndex + 1, level.ops.length)}/{level.ops.length}
        </DojoBadge>
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

function UnionFindDojoPageBody() {
  const { completedCount } = useBridgeGame();
  useGameKeyboard();

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <DojoGameChrome
        icon={Link2}
        title="Bridge Builder"
        completedCount={completedCount}
        levelCount={LEVEL_IDS.length}
      />
      <div className="flex justify-center px-3 pb-1 pt-16 min-[720px]:pt-3">
        <LevelStrip />
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-y-auto px-3 pb-3">
        <HarborBoard />
        <StatusBar />
      </div>
      <IntroCard />
      <CompleteCard />
      <TouchPad />
    </div>
  );
}

export function UnionFindDojoPage() {
  return (
    <BridgeGameProvider>
      <UnionFindDojoPageBody />
    </BridgeGameProvider>
  );
}
