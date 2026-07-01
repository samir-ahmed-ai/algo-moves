import { useState } from 'react';
import { cn } from '../../../lib/cn';
import { Btn, Field, nodeText } from '../../../shell/canvas/nodeui';

export interface BeatTrack {
  id: string;
  label: string;
  steps: boolean[];
}

export function BeatMachineBuilder({ onApply }: { onApply: (tracks: BeatTrack[]) => void }) {
  const [tracks, setTracks] = useState<BeatTrack[]>([
    { id: 'a', label: 'Track A', steps: Array(8).fill(false) },
    { id: 'b', label: 'Track B', steps: Array(8).fill(false) },
  ]);

  const toggle = (ti: number, si: number) => {
    setTracks((ts) =>
      ts.map((t, i) =>
        i === ti ? { ...t, steps: t.steps.map((s, j) => (j === si ? !s : s)) } : t,
      ),
    );
  };

  return (
    <div className="nodrag flex flex-col gap-2">
      <Field label="Multi-track pattern">
        {tracks.map((track, ti) => (
          <div key={track.id} className="mb-1 flex items-center gap-1">
            <span className={cn('w-14 shrink-0 truncate', nodeText.xs)}>{track.label}</span>
            {track.steps.map((on, si) => (
              <button
                key={si}
                type="button"
                onClick={() => toggle(ti, si)}
                className={`h-5 w-5 rounded-sm border ${on ? 'border-accent bg-accent/30' : 'border-edge bg-panel2'}`}
              />
            ))}
          </div>
        ))}
      </Field>
      <Btn variant="good" size="sm" onClick={() => onApply(tracks)}>
        Apply tracks
      </Btn>
    </div>
  );
}
