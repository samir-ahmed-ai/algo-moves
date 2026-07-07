import { LineChart } from 'lucide-react';

import { useCanvasFrame, ControlsAccordion, EmptyState, Pill, Spark, Stat } from '@/shell/canvas';
/** #38/#42 Watch: sparkline + current value for each numeric state field. */
export function WatchPanelBody() {
  const { frames, player } = useCanvasFrame();
  const s0 = (frames[0]?.state ?? {}) as Record<string, unknown>;
  const keys = Object.keys(s0).filter((k) => typeof s0[k] === 'number');
  if (keys.length === 0) {
    return (
      <EmptyState
        icon={<LineChart className="h-5 w-5" />}
        title="No numeric variables"
        hint="This problem exposes no numeric state to watch."
      />
    );
  }
  return (
    <ControlsAccordion
      title="Watch"
      className="reference-panel reference-panel--watch border-t-0"
      right={<Pill>{keys.length}</Pill>}
    >
      <div className="reference-panel__stack flex flex-col gap-2">
        {keys.map((k) => {
          const series = frames.map((f) => (f.state as Record<string, number>)[k] ?? 0);
          return (
            <div key={k} className="watch-row flex flex-col gap-0.5">
              <Stat k={k} v={series[player.index]} tone="accent" />
              <Spark series={series} index={player.index} />
            </div>
          );
        })}
      </div>
    </ControlsAccordion>
  );
}
