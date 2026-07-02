import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Rewind,
  RotateCcw,
  NotebookText,
} from 'lucide-react';
import { useWorkspace } from '@/store/workspace';
import { useCanvasFrame } from './CanvasContext';
import { cn } from '../../lib/cn';
import { CHROME_BTN } from '../chrome';
import { ChromeHint } from '../chromeUi';
import { HudBtn } from './CanvasTools';

const icon = 'h-2.5 w-2.5';

export function TransportBar({ className, compact }: { className?: string; compact?: boolean }) {
  const { frames, player } = useCanvasFrame();
  const { setTracePreviewOpen } = useWorkspace();
  const stepLabel = frames.length ? `${player.index + 1}/${frames.length}` : '0/0';

  return (
    <div
      className={cn(
        compact
          ? 'flex w-full min-h-[var(--row)] flex-wrap items-center justify-center gap-0.5 rounded-md border border-edge bg-panel/95 px-0.5 py-0'
          : 'flex min-h-[var(--row)] items-center gap-0.5 rounded-full border border-edge bg-panel/95 px-1 py-0 shadow-[var(--shadow-lg)] backdrop-blur',
        className,
      )}
    >
      <HudBtn nodrag variant="solid" onClick={player.reset} title="Reset to start">
        <Rewind className={icon} />
      </HudBtn>
      <HudBtn nodrag variant="solid" onClick={player.prev} title="Step back (←)">
        <SkipBack className={icon} />
      </HudBtn>
      <button
        type="button"
        onClick={player.togglePlay}
        title={player.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        className={cn('nodrag grid place-items-center rounded-full bg-accent text-white shadow-sm transition-transform hover:scale-105', CHROME_BTN)}
      >
        {player.isPlaying ? <Pause className={icon} /> : <Play className={icon} />}
      </button>
      <HudBtn nodrag variant="solid" onClick={player.next} title="Step forward (→)">
        <SkipForward className={icon} />
      </HudBtn>
      <HudBtn nodrag variant="solid" onClick={() => player.goTo(player.total - 1)} title="Jump to end">
        <RotateCcw className={cn(icon, 'rotate-180')} />
      </HudBtn>
      <span className="mx-0.5 h-3 w-px bg-edge" />
      <label className="nodrag flex items-center gap-0.5 px-0.5" title="Playback speed">
        <ChromeHint mono className="text-ink3">{player.speed.toFixed(1)}×</ChromeHint>
        <input
          type="range"
          min={0.25}
          max={4}
          step={0.25}
          value={player.speed}
          onChange={(e) => player.setSpeed(Number(e.target.value))}
          className={cn('h-0.5 cursor-pointer accent-[var(--accent)]', compact ? 'w-8' : 'w-10')}
        />
      </label>
      {!compact && <span className="mx-0.5 h-3 w-px bg-edge" />}
      <ChromeHint mono className="px-0.5 text-ink2">{stepLabel}</ChromeHint>
      <HudBtn nodrag variant="solid" onClick={() => setTracePreviewOpen(true)} title="Generated trace preview">
        <NotebookText className={icon} />
      </HudBtn>
    </div>
  );
}
