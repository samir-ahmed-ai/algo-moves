import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { nodeTextWrap } from '../../../canvas/ui/nodeui';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { useVimGame } from '../../canvas/VimGameProvider';
import { VimBadge, VimBtn, VimKbd } from '../vimUi';

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

  const moveLabel =
    level.parMoves != null ? `${moves}/${level.parMoves} moves` : `${moves} moves`;

  return (
    <div className="min-w-0">
      <p className={cn('mb-1 text-[10px] font-medium text-ink3', nodeTextWrap)}>{moveLabel}</p>
      <div
        className={cn(
          'font-mono text-[11px] transition-colors',
          lastMotionOk && 'text-accent',
          error && 'text-bad',
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <VimBadge tone="accent">-- NORMAL --</VimBadge>
          {echo ? <VimKbd>{echo}</VimKbd> : null}
        </div>
        {isMobile ? (
          <p className="mt-1.5 text-[10px] text-bad">Connect a keyboard to play</p>
        ) : message ? (
          <p className={cn('mt-1.5', nodeTextWrap, error ? 'text-bad' : 'text-good')}>{message}</p>
        ) : (
          <p className="mt-1.5 text-[10px] text-ink3">Reach ★ with Vim motions</p>
        )}
      </div>
      {complete ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {nextId ? (
            <VimBtn variant="accent" onClick={() => selectLevel(nextId)}>
              Next
              <ArrowRight className="h-2.5 w-2.5" />
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
