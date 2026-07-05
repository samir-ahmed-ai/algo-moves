import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

import { useCanvasFrame, useCanvasStatic, exampleInputIndex, stepExampleInput, PanelHeaderAction, PanelHeaderMeta, nodeIconGlyph } from '@/shell/canvas';
/** Live step counter for a node header — its own frame-subscribing leaf so it can
 *  update on every step without re-rendering the whole node. */
export function HeaderStep() {
  const { player } = useCanvasFrame();
  return (
    <PanelHeaderMeta className="mr-0.5" aria-label="current step">
      {player.index + 1}/{player.total}
    </PanelHeaderMeta>
  );
}

export function HeaderPlay() {
  const { player } = useCanvasFrame();
  return (
    <PanelHeaderAction
      variant="primary"
      active={!player.isPlaying}
      title={player.isPlaying ? 'pause' : 'play'}
      onClick={() => player.togglePlay()}
    >
      {player.isPlaying ? <Pause className={nodeIconGlyph} /> : <Play className={nodeIconGlyph} />}
    </PanelHeaderAction>
  );
}

export function HeaderExamplesNav() {
  const { plugin, inputId, setInputId } = useCanvasStatic();
  const inputs = plugin.inputs;
  if (inputs.length <= 1) return null;

  const idx = exampleInputIndex(inputs, inputId);
  const active = inputs[idx] ?? inputs[0];
  const label = active?.label ?? '';
  const prev = idx > 0 ? inputs[idx - 1] : undefined;
  const next = idx < inputs.length - 1 ? inputs[idx + 1] : undefined;

  return (
    <>
      <PanelHeaderMeta className="mr-0.5 max-w-[120px] truncate" aria-label="current example">
        {idx + 1}/{inputs.length}
        {label ? ` · ${label}` : ''}
      </PanelHeaderMeta>
      <PanelHeaderMeta className="mr-0.5 hidden max-w-[100px] truncate text-[length:var(--node-fs-2xs,0.5625rem)] text-ink3 md:inline-flex">
        {prev ? `← ${prev.label}` : '← Start'}
      </PanelHeaderMeta>
      <PanelHeaderAction
        variant="ghost"
        title={prev ? `Previous example: ${prev.label}` : 'Previous example'}
        disabled={idx === 0}
        onClick={() => {
          const previous = stepExampleInput(inputs, inputId, -1);
          if (previous) setInputId(previous.id);
        }}
      >
        <ChevronLeft className={nodeIconGlyph} />
      </PanelHeaderAction>
      <PanelHeaderAction
        variant="ghost"
        title={next ? `Next example: ${next.label}` : 'Next example'}
        disabled={idx === inputs.length - 1}
        onClick={() => {
          const upcoming = stepExampleInput(inputs, inputId, 1);
          if (upcoming) setInputId(upcoming.id);
        }}
      >
        <ChevronRight className={nodeIconGlyph} />
      </PanelHeaderAction>
    </>
  );
}
