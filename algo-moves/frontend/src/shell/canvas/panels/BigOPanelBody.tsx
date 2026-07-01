import { inputFrameCount } from '../../../lib/inputFrameCounts';
import { useCanvasStatic } from '../CanvasContext';
import { Hint, Meter, Stat } from '../nodeui';

/** "Big-O race": operation count (frames) per sample input, current one highlighted. */
export function BigOPanelBody() {
  const { plugin, inputId, inputFrameCounts } = useCanvasStatic();
  const data = plugin.inputs.map((inp) => ({
    id: inp.id,
    label: inp.label,
    ops: inputFrameCount(inputFrameCounts, inp.id),
  }));
  const max = Math.max(...data.map((d) => d.ops), 1);
  return (
    <div className="flex flex-col gap-2">
      <Hint>Total steps each example takes — order examples by size to read the growth curve.</Hint>
      <div className="flex flex-col gap-1.5">
        {data.map((d) => {
          const cur = d.id === inputId;
          return (
            <div key={d.id} className="flex flex-col gap-0.5">
              <Stat k={d.label} v={d.ops} tone={cur ? 'accent' : 'default'} />
              <Meter value={d.ops} max={max} tone={cur ? 'accent' : 'muted'} height={6} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
