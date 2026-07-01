import { useEffect, useMemo } from 'react';
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
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
  const hasFrames = baseFrames.length > 0;
  const frameType = frame?.move?.type ?? 'frame';
  const stepLabel = hasFrames ? `${player.index + 1}/${player.total}` : '0/0';
  const hasMove = caption.length > 0;
  const hasNext = hasFrames && player.index < player.total - 1;
  const hasPrev = player.index > 0;
  const railToneClass = player.isPlaying ? 'text-accent' : 'text-ink3';

  useEffect(() => {
    if (!hasFrames) return;
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
      <div className="mobile-viz-board min-h-0 flex-1 overflow-hidden rounded-2xl border border-edge/60 bg-panel2/30 p-1" data-noswipe>
        <VizFitBox className="h-full min-h-0 w-full" remeasureKey={`${player.index}-${frame.move.type}`}>
          <ErrorBoundary resetKey={`${plugin.meta.id}:${player.index}`} label={plugin.meta.id}>
            <View frame={frame} />
          </ErrorBoundary>
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
          <span className={cn('mobile-viz-chip ml-auto shrink-0', railToneClass)}>{stepLabel}</span>
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
        <div className="mt-2 flex min-w-0 items-center gap-1.5">
          <span className="mobile-viz-chip">{frameType}</span>
          <span className={cn('mobile-viz-chip', railToneClass)}>{player.isPlaying ? 'Playing' : 'Paused'}</span>
          <span className="ml-auto shrink-0 text-[11px] text-ink3">
            {hasFrames ? `${frame.move.type}` : 'No frame'}
          </span>
        </div>
        {hasMove ? (
          <p
            className="mobile-viz-caption mt-2 font-mono text-[11px] text-ink3"
            key={`${player.index}-${frame?.move?.type ?? 'frame'}`}
            title={caption}
          >
            {caption}
          </p>
        ) : null}
        <button
          type="button"
          className="mt-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-panel2/80 text-ink3 transition-colors hover:bg-panel2"
          onClick={player.reset}
          aria-label="Replay from start"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
