import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { useCanvasFrame } from '@/shell/canvas';
import type { Tone } from '@/core';

const TONE_CLASS: Record<Tone, string> = {
  default: 'border-accent/25 bg-accentbg text-accent',
  good: 'border-good/30 bg-goodbg text-good',
  bad: 'border-bad/30 bg-badbg text-bad',
};

/**
 * The teaching caption for the current animation step — `frame.move.caption`, which
 * was previously only spoken by the narrator. Surfaced as a ribbon above the board so
 * the learner reads what each step is doing.
 */
export function StageCaption() {
  const { frame } = useCanvasFrame();
  const move = frame?.move;
  const text = move?.caption || move?.note;
  if (!text) return null;
  const toneCls = TONE_CLASS[move?.tone ?? 'default'];

  return (
    <div className="stage-caption flex shrink-0 items-center gap-2.5 border-b border-edge bg-panel/55 px-3 py-1.5">
      {move?.type && (
        <span
          className={cn(
            'stage-caption__chip shrink-0 rounded-full border px-2 py-0.5 font-semibold uppercase tracking-[0.06em]',
            chromeText.tight,
            toneCls,
          )}
        >
          {move.type}
        </span>
      )}
      <span
        className={cn(
          'stage-caption__text min-w-0 flex-1 truncate font-mono text-ink2',
          chromeText.xs,
        )}
        title={text}
      >
        {text}
      </span>
    </div>
  );
}
