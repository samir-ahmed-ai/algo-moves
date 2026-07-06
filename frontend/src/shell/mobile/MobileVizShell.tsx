import { useEffect, useRef } from 'react';
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import type { ProblemPlugin } from '../../core/types';
import { cn } from '@/lib/utils/cn';
import { usePluginFrames } from '@/hooks';
import { ErrorBoundary } from '../ErrorBoundary';
import { FlipFrame } from '@/components/shared/FlipFrame';
import { VizFitBox } from '@/components/shared/vizFit';

/** Lightweight plugin animation runner for the mobile swipe deck. */
export function MobileVizShell({ plugin, onWatched }: { plugin: ProblemPlugin; onWatched?: () => void }) {
  const { input, baseFrames, player, frame } = usePluginFrames(plugin);
  const View = plugin.View;
  const caption = (frame?.move?.note?.trim() || frame?.move?.caption?.trim()) ?? '';
  const hasFrames = baseFrames.length > 0;
  const stepLabel = hasFrames ? `${player.index + 1}/${player.total}` : '0/0';
  // Reserve the caption slot for the whole run — frames without a note must
  // not collapse it and jump the transport card's height every step.
  const anyCaption = baseFrames.some((f) => f.move?.note?.trim() || f.move?.caption?.trim());
  const hasNext = hasFrames && player.index < player.total - 1;
  const hasPrev = player.index > 0;
  const isAtEnd = hasFrames && player.index === player.total - 1;
  const onWatchedRef = useRef(onWatched);
  onWatchedRef.current = onWatched;

  useEffect(() => {
    if (!hasFrames) return;
    if (baseFrames.length > 1 && !player.isPlaying) player.togglePlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-play once per problem
  }, [plugin.meta.id]);

  // Fire onWatched once the last frame is reached and playback stops.
  useEffect(() => {
    if (isAtEnd && !player.isPlaying) {
      onWatchedRef.current?.();
    }
  }, [isAtEnd, player.isPlaying]);

  if (!input || !frame) {
    return (
      <div className="mobile-viz-empty grid flex-1 place-items-center px-4 text-center text-[13px] text-ink3">
        No sample input for this problem.
      </div>
    );
  }

  const btn =
    'grid h-9 w-9 place-items-center rounded-full text-ink2 transition-colors enabled:hover:bg-panel2 enabled:hover:text-ink disabled:opacity-30';

  return (
    <div className="mobile-viz-shell flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'mobile-viz-board min-h-0 flex-1 overflow-hidden rounded-2xl border bg-panel2/30 p-1 transition-colors duration-300',
          isAtEnd ? 'border-good/60 bg-goodbg/10' : 'border-edge/60',
        )}
        data-noswipe
      >
        <VizFitBox className="h-full min-h-0 w-full" remeasureKey={`${plugin.meta.id}-${player.index}-${frame.move.type}`}>
          <FlipFrame frameKey={player.index} resetKey={plugin.meta.id}>
            <ErrorBoundary resetKey={`${plugin.meta.id}:${player.index}`} label={plugin.meta.id}>
              <View frame={frame} />
            </ErrorBoundary>
          </FlipFrame>
        </VizFitBox>
      </div>

      <div className="mobile-viz-transport mt-2 shrink-0 rounded-2xl border border-edge bg-panel px-3 py-2" data-noswipe>
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={player.prev}
            disabled={!hasFrames || !hasPrev}
            className={btn}
            aria-label="Previous step"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={player.togglePlay}
            className={cn(btn, !player.isPlaying && 'bg-accent text-white enabled:hover:bg-accent enabled:hover:text-white')}
            aria-label={player.isPlaying ? 'Pause' : 'Play'}
          >
            {player.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={player.next}
            disabled={!hasFrames || !hasNext}
            className={btn}
            aria-label="Next step"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <span
              className={cn(
                'mobile-viz-chip',
                isAtEnd ? 'text-good' : player.isPlaying ? 'text-accent' : 'text-ink3',
              )}
            >
              {stepLabel}
            </span>
            <button
              type="button"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-panel2/80 text-ink3 transition-colors hover:bg-panel2"
              onClick={player.reset}
              aria-label="Replay from start"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, player.total - 1)}
          value={player.index}
          onChange={(e) => player.goTo(Number(e.target.value))}
          disabled={!hasFrames}
          className="mobile-viz-slider nodrag mt-2 h-1 w-full cursor-pointer accent-accent"
          aria-label="Replay step"
        />
        {anyCaption && (
          <p
            className="mobile-viz-caption mt-2"
            key={`${player.index}-${frame?.move?.type ?? 'frame'}`}
            title={caption || undefined}
          >
            {caption || '\u00a0'}
          </p>
        )}
      </div>
    </div>
  );
}
