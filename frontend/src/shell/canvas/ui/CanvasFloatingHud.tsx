import { Controls } from '@xyflow/react';
import { useWorkspace } from '@/store/workspace';

/** Native XYFlow zoom/fit controls — bottom-left on the canvas. */
export function CanvasFloatingHud() {
  const { present, mode } = useWorkspace();
  if (present || mode !== 'visualize') return null;

  return (
    <Controls
      position="bottom-left"
      showInteractive={false}
      className="!bottom-[calc(var(--chrome-bottom,0px)+8px)] !left-2 !m-0"
    />
  );
}
