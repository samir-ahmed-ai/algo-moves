import { useEffect, useMemo } from 'react';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { usePlayer } from '../../core';
import type { ProblemPlugin } from '../../core/types';
import { cn } from '../../lib/cn';
import { ErrorBoundary } from '../ErrorBoundary';
import { VizFitBox } from '../canvas/nodeui';

/** Lightweight plugin animation runner for the mobile swipe deck. */
export function MobileVizShell({ plugin }: { plugin: ProblemPlugin }) {
  const input = plugin.inputs[0];
  const baseFrames = useMemo(
    () => (input ? plugin.record(input.value) : []),
    [plugin, input],
  );
  const player = usePlayer(Math.max(baseFrames.length, 1));
  const frame = baseFrames[player.index] ?? baseFrames[0];
  const View = plugin.View;
  const caption = (frame?.move?.note?.trim() || frame?.move?.caption?.trim()) ?? '';

  useEffect(() => {
    if (baseFrames.length > 1 && !player.isPlaying) player.togglePlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-play once per problem
  }, [plugin.meta.id]);

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
      <div className="mobile-viz-board min-h-0 flex-1 overflow-hidden rounded-2xl border border-edge/60 bg-panel2/30 p-2" data-noswipe>
        <VizFitBox className="h-full min-h-[180px] w-full" remeasureKey={`${player.index}-${frame.move.type}`}>
          <ErrorBoundary resetKey={`${plugin.meta.id}:${player.index}`} label={plugin.meta.id}>
            <View frame={frame} />
          </ErrorBoundary>
        </VizFitBox>
      </div>

      <div className="mobile-viz-transport mt-2 shrink-0 rounded-2xl border border-edge bg-panel px-3 py-2" data-noswipe>
        <div className="flex min-w-0 items-center gap-1">
          <button type="button" onClick={player.prev} disabled={player.index === 0} className={btn} aria-label="Previous step">
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
            disabled={player.index >= player.total - 1}
            className={btn}
            aria-label="Next step"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-ink3">
            {player.index + 1}/{player.total}
          </span>
        </div>
        {caption && (
          <p className="mobile-viz-caption mt-1.5 font-mono text-[11px] text-ink3" title={caption}>
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}
