
import { useCanvasFrame, useCanvasStatic, Chip, ControlsAccordion, Label, Meter, Stat, StatGrid } from '@/shell/canvas';
export function MetricsBody() {
  const { plugin } = useCanvasStatic();
  const { frames, frame, player } = useCanvasFrame();
  const verdict = plugin.verdict?.(frames);
  const counts = new Map<string, number>();
  for (let i = 0; i <= player.index && i < frames.length; i++) {
    const t = frames[i].move.type.toLowerCase();
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const tally = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const maxCount = tally[0]?.[1] ?? 1;
  return (
    <div className="flex flex-col">
      <StatGrid cols={2}>
        <Stat k="moves" v={frames.length} />
        <Stat k="step" v={`${player.index + 1} / ${frames.length}`} tone="accent" />
        <Stat k="move" v={frame.move.type.toLowerCase()} />
      </StatGrid>
      {verdict && (
        <div className="flex items-center justify-between gap-3 py-[3px]">
          <Label>verdict</Label>
          <Chip tone={verdict.ok ? 'good' : 'bad'}>{verdict.label}</Chip>
        </div>
      )}
      {tally.length > 0 && (
        <ControlsAccordion title="Operations · to here" defaultOpen={false}>
          <div className="flex flex-col gap-1">
            {tally.map(([t, c]) => (
              <div key={t} className="flex flex-col gap-0.5">
                <Stat k={t} v={c} tone="accent" />
                <Meter value={c} max={maxCount} tone="accent" height={3} />
              </div>
            ))}
          </div>
        </ControlsAccordion>
      )}
    </div>
  );
}
