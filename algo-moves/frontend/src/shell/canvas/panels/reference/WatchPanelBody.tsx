import { LineChart } from 'lucide-react';
import { useCanvasFrame } from '../../CanvasContext';
import { ControlsAccordion, EmptyState, Pill, Spark, Stat } from '../../nodeui';

/** #38/#42 Watch: sparkline + current value for each numeric state field. */
export function WatchPanelBody() {
  const { frames, player } = useCanvasFrame();
  const s0 = (frames[0]?.state ?? {}) as Record<string, unknown>;
  const keys = Object.keys(s0).filter((k) => typeof s0[k] === 'number');
  if (keys.length === 0) {
    return (
      <EmptyState icon={<LineChart className="h-5 w-5" />} title="No numeric variables" hint="This problem exposes no numeric state to watch." />
    );
  }
  return (
    <ControlsAccordion title="Watch" className="border-t-0" right={<Pill>{keys.length}</Pill>}>
      <div className="flex flex-col gap-2">
        {keys.map((k) => {
          const series = frames.map((f) => (f.state as Record<string, number>)[k] ?? 0);
          return (
            <div key={k} className="flex flex-col gap-0.5">
              <Stat k={k} v={series[player.index]} tone="accent" />
              <Spark series={series} index={player.index} />
            </div>
          );
        })}
      </div>
    </ControlsAccordion>
  );
}
