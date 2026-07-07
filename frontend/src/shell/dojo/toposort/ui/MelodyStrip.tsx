import { Music } from 'lucide-react';
import { useTopoGame } from '../TopoGameProvider';

export function MelodyStrip() {
  const { level, locked } = useTopoGame();

  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-center gap-1.5 px-3 py-2.5"
      aria-label="Melody so far"
    >
      <Music className="h-3.5 w-3.5 shrink-0 text-ink3" aria-hidden />
      {level.nodes.map((_, slot) => {
        const idx = locked[slot];
        const node = idx != null ? level.nodes[idx] : undefined;
        return node ? (
          <span
            key={slot}
            className="flex h-7 items-center gap-1 rounded-md border border-accent/40 bg-accentbg px-1.5 text-xs text-accent"
          >
            <span className="font-mono font-semibold">{node.key}</span>
            <span className="hidden max-w-[4.5rem] truncate min-[480px]:inline">{node.label}</span>
          </span>
        ) : (
          <span
            key={slot}
            className="grid h-7 w-8 place-items-center rounded-md border border-dashed border-edge text-[length:var(--fs-2xs)] tabular-nums text-ink3"
          >
            {slot + 1}
          </span>
        );
      })}
    </div>
  );
}
