import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { VimBadge, VimBtn, VimKbd } from '../vimUi';

import { nodeTextWrap } from '@/shell/canvas';
import { useVimGame } from '../../canvas/VimGameProvider';
export function StatusPanelContent() {
  const isMobile = useIsMobile();
  const {
    moves,
    level,
    echo,
    message,
    error,
    complete,
    nextId,
    lastMotionOk,
    selectLevel,
    resetLevel,
  } = useVimGame();

  const moveLabel = level.parMoves != null ? `${moves}/${level.parMoves} moves` : `${moves} moves`;

  return (
    <div className="min-w-0">
      <p className={cn('mb-2.5 text-base font-medium text-ink3', nodeTextWrap)}>{moveLabel}</p>
      <div
        className={cn(
          'font-mono text-lg transition-colors',
          lastMotionOk && 'text-accent',
          error && 'text-bad',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <VimBadge tone="accent">-- NORMAL --</VimBadge>
          {echo ? <VimKbd>{echo}</VimKbd> : null}
        </div>
        {isMobile && !message ? (
          <p className="mt-3 text-base text-ink3">Tap the key pad below to move</p>
        ) : message ? (
          <p className={cn('mt-3 text-base', nodeTextWrap, error ? 'text-bad' : 'text-good')}>
            {message}
          </p>
        ) : (
          <p className="mt-3 text-base text-ink3">Reach ★ with Vim motions</p>
        )}
      </div>
      {complete ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {nextId ? (
            <VimBtn variant="accent" onClick={() => selectLevel(nextId)}>
              Next
              <ArrowRight className="h-3 w-3" />
            </VimBtn>
          ) : (
            <VimBadge tone="good">Dojo complete!</VimBadge>
          )}
          <VimBtn variant="ghost" onClick={() => resetLevel()}>
            Replay
          </VimBtn>
        </div>
      ) : null}
    </div>
  );
}
