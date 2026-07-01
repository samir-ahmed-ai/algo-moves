import { useWorkspace } from '../../lib/workspace';
import { cn } from '../../lib/cn';
import { chromeText } from '../chromeUi';

/** Dedicated zoom slider — desktop only (hidden on narrow viewports). */
export function ZoomSlider() {
  const { canvasZoom } = useWorkspace();
  if (!canvasZoom) return null;

  const pct = Math.round(canvasZoom.zoom * 100);

  return (
    <div className="hidden items-center gap-2 md:flex">
      <input
        type="range"
        min={25}
        max={150}
        value={pct}
        onChange={() => {
          /* zoom driven by React Flow controls — slider reflects state */
        }}
        className="w-24 accent-[var(--accent)]"
        title={`Zoom ${pct}%`}
      />
      <span className={cn('w-10 text-right tabular-nums text-ink3', chromeText.xs)}>{pct}%</span>
      <button type="button" onClick={canvasZoom.onFit} className={cn('text-ink3 hover:text-ink', chromeText.xs)}>
        Fit
      </button>
    </div>
  );
}
