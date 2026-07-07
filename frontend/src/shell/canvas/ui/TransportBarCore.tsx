import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Rewind,
  RotateCcw,
  NotebookText,
  ImageDown,
} from 'lucide-react';
import { useCallback } from 'react';
import { useWorkspace } from '@/store/workspace';
import { useCanvasFrame, useCanvasStatic } from '../CanvasContext';
import { exportRunSnapshot } from '@/lib/export';
import { cn } from '@/lib/utils/cn';
import { CHROME_BTN } from '../../chrome';
import { ChromeHint } from '../../chromeUi';
import { HudBtn } from './CanvasTools';

const icon = 'h-2.5 w-2.5';

export function TransportBar({
  className,
  compact,
  vertical,
}: {
  className?: string;
  compact?: boolean;
  vertical?: boolean;
}) {
  const { frames, player } = useCanvasFrame();
  const { item } = useCanvasStatic();
  const { setTracePreviewOpen } = useWorkspace();
  const stepLabel = frames.length ? `${player.index + 1}/${frames.length}` : '0/0';

  const onExportSnapshot = useCallback(async () => {
    const target =
      document.querySelector<HTMLElement>('[data-panel-kind="workbench"]') ??
      document.querySelector<HTMLElement>('.react-flow__viewport') ??
      document.querySelector<HTMLElement>('.algo-canvas');
    if (!target) return;
    const slug = item.title.replace(/[^\w.-]+/g, '-').toLowerCase() || 'frame';
    await exportRunSnapshot(target, 'gif', {
      filename: `${slug}-step-${player.index + 1}`,
      backgroundColor:
        getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || undefined,
    });
  }, [item.title, player.index]);

  const transportBtns = (
    <>
      <HudBtn nodrag variant="solid" onClick={player.reset} title="Reset to start">
        <Rewind className={icon} aria-hidden />
      </HudBtn>
      <HudBtn nodrag variant="solid" onClick={player.prev} title="Step back">
        <SkipBack className={icon} aria-hidden />
      </HudBtn>
      <button
        type="button"
        onClick={player.togglePlay}
        title={player.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        aria-label={player.isPlaying ? 'Pause playback' : 'Play playback'}
        aria-pressed={player.isPlaying}
        className={cn(
          'transport-bar__play nodrag grid place-items-center rounded-full bg-accent text-white shadow-sm transition-transform hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100',
          CHROME_BTN,
        )}
      >
        {player.isPlaying ? (
          <Pause className={icon} aria-hidden />
        ) : (
          <Play className={icon} aria-hidden />
        )}
      </button>
      <HudBtn nodrag variant="solid" onClick={player.next} title="Step forward">
        <SkipForward className={icon} aria-hidden />
      </HudBtn>
      <HudBtn
        nodrag
        variant="solid"
        onClick={() => player.goTo(player.total - 1)}
        title="Jump to end"
      >
        <RotateCcw className={cn(icon, 'rotate-180')} aria-hidden />
      </HudBtn>
    </>
  );

  const speedControl = (
    <label
      className={cn(
        'transport-bar__speed nodrag flex px-0.5',
        vertical ? 'flex-col items-center gap-1' : 'items-center gap-0.5',
      )}
      title="Playback speed"
    >
      <span className="sr-only">Playback speed</span>
      <ChromeHint mono className="text-ink3" aria-hidden>
        {player.speed.toFixed(1)}×
      </ChromeHint>
      <input
        type="range"
        min={0.25}
        max={4}
        step={0.25}
        value={player.speed}
        onChange={(e) => player.setSpeed(Number(e.target.value))}
        aria-valuemin={0.25}
        aria-valuemax={4}
        aria-valuenow={player.speed}
        aria-valuetext={`${player.speed.toFixed(1)} times speed`}
        aria-label="Playback speed"
        className={cn(
          'transport-bar__range cursor-pointer accent-[var(--accent)]',
          vertical ? 'h-12 w-1 appearance-none rounded-full bg-panel2' : 'h-0.5',
          !vertical && (compact ? 'w-8' : 'w-10'),
        )}
      />
    </label>
  );

  const stepCounter = (
    <ChromeHint
      mono
      className="transport-bar__counter px-0.5 text-ink2"
      aria-live="polite"
      aria-atomic="true"
    >
      {stepLabel}
    </ChromeHint>
  );

  const scrubber = frames.length > 1 && (
    <input
      type="range"
      min={0}
      max={Math.max(frames.length - 1, 0)}
      value={player.index}
      onChange={(e) => player.goTo(Number(e.target.value))}
      aria-label="Scrub timeline"
      aria-valuemin={0}
      aria-valuemax={Math.max(frames.length - 1, 0)}
      aria-valuenow={player.index}
      aria-valuetext={`Frame ${player.index + 1} of ${frames.length}`}
      className={cn(
        'transport-bar__scrubber nodrag h-1 w-full cursor-pointer appearance-none rounded-full bg-panel2 accent-[var(--accent)]',
        vertical ? 'mt-1' : '',
      )}
    />
  );

  const traceBtn = (
    <HudBtn
      nodrag
      variant="solid"
      onClick={() => setTracePreviewOpen(true)}
      title="Generated trace preview"
    >
      <NotebookText className={icon} aria-hidden />
    </HudBtn>
  );

  const exportBtn = (
    <HudBtn
      nodrag
      variant="solid"
      onClick={() => void onExportSnapshot()}
      title="Export current frame as GIF"
      aria-label="Export current frame as GIF"
    >
      <ImageDown className={icon} aria-hidden />
    </HudBtn>
  );

  if (vertical) {
    return (
      <div
        role="toolbar"
        aria-label="Visualization transport"
        className={cn(
          'transport-bar transport-bar--vertical flex flex-col items-center gap-[var(--gap)] py-[var(--pad)]',
          className,
        )}
      >
        {transportBtns}
        <span className="my-[var(--gap)] h-px w-full bg-edge" aria-hidden />
        {!compact && speedControl}
        {!compact && scrubber}
        {!compact && stepCounter}
        {traceBtn}
        {exportBtn}
      </div>
    );
  }

  if (compact) {
    return (
      <div
        role="toolbar"
        aria-label="Visualization transport"
        className={cn(
          'transport-bar transport-bar--compact flex w-full min-h-[var(--row)] flex-col gap-1 rounded-md border border-edge bg-panel/95 px-[var(--gap)] py-1',
          className,
        )}
      >
        <div className="flex items-center justify-center gap-[var(--gap)]">
          {transportBtns}
          {traceBtn}
          {exportBtn}
        </div>
        {scrubber}
      </div>
    );
  }

  return (
    <div
      role="toolbar"
      aria-label="Visualization transport"
      className={cn(
        'transport-bar flex min-h-[var(--row)] flex-col gap-1 rounded-full border border-edge bg-panel/95 px-2 py-1 shadow-[var(--shadow-lg)] backdrop-blur',
        className,
      )}
    >
      <div className="flex items-center gap-[var(--gap)]">
        {transportBtns}
        <span className="mx-0.5 h-3 w-px bg-edge" aria-hidden />
        {speedControl}
        <span className="mx-0.5 h-3 w-px bg-edge" aria-hidden />
        {stepCounter}
        {traceBtn}
        {exportBtn}
      </div>
      {scrubber}
    </div>
  );
}
