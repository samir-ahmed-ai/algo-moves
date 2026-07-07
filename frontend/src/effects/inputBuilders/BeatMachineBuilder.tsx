import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { Btn, Field } from '@/components/shared/formControls';
import { GridToggleButton } from '../components/GridToggleButton';
import { nodeText } from '@/design/typography';

export interface BeatTrack {
  id: string;
  label: string;
  steps: readonly boolean[];
}

function cloneTracks(tracks: readonly BeatTrack[]): BeatTrack[] {
  return tracks.map((track) => ({ ...track, steps: [...track.steps] }));
}

export function BeatMachineBuilder({
  onApply,
}: {
  readonly onApply: (tracks: BeatTrack[]) => void;
}): ReactNode {
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
    <div className="input-builder input-builder--beat-machine nodrag flex flex-col gap-2">
      <Field label="Multi-track pattern">
        {tracks.map((track, ti) => (
          <div key={track.id} className="input-builder-track-row mb-1 flex items-center gap-1">
            <span className={cn('input-builder-track-label w-14 shrink-0 truncate', nodeText.xs)}>
              {track.label}
            </span>
            {track.steps.map((on, si) => (
              <GridToggleButton
                key={si}
                active={on}
                label={`${track.label} step ${si + 1}`}
                onClick={() => toggle(ti, si)}
              />
            ))}
          </div>
        ))}
      </Field>
      <Btn variant="good" size="sm" onClick={() => onApply(cloneTracks(tracks))}>
        Apply tracks
      </Btn>
    </div>
  );
}
