import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useCanvasFrame, useCanvasStatic } from '../CanvasContext';
import { exampleInputIndex, stepExampleInput } from '../exampleInputNav';
import { PanelHeaderAction, PanelHeaderMeta } from '../nodeui';

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
      {player.isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
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

  return (
    <>
      <PanelHeaderMeta className="mr-0.5 max-w-[120px] truncate" aria-label="current example">
        {idx + 1}/{inputs.length}
        {label ? ` · ${label}` : ''}
      </PanelHeaderMeta>
      <PanelHeaderAction
        variant="ghost"
        title="Previous example"
        disabled={idx === 0}
        onClick={() => {
          const next = stepExampleInput(inputs, inputId, -1);
          if (next) setInputId(next.id);
        }}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </PanelHeaderAction>
      <PanelHeaderAction
        variant="ghost"
        title="Next example"
        disabled={idx === inputs.length - 1}
        onClick={() => {
          const next = stepExampleInput(inputs, inputId, 1);
          if (next) setInputId(next.id);
        }}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </PanelHeaderAction>
    </>
  );
}
