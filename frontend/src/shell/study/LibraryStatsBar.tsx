import { useMemo, type ReactNode } from 'react';
import { BookOpen, Code2, Flame, LayoutGrid, Target, Trophy } from 'lucide-react';
import { catalog, getAllCategories, getTracks } from '@/content';
import { statFor, useProgress } from '@/store/persistence';
import { cn } from '@/lib/utils/cn';

interface Stat {
  icon: ReactNode;
  value: number;
  label: string;
}

/**
 * Slim "Your library" progress strip — surfaced inside Learn mode (the studio)
 * so catalog-wide stats live where the actual learning happens rather than on
 * the landing page.
 */
export function LibraryStatsBar({ className }: { className?: string }) {
  const progress = useProgress();

  const stats = useMemo<Stat[]>(() => {
    const problems = catalog.items.filter((i) => i.pluginId);
    const mastered = problems.filter((i) => statFor(progress, i.id).mastered).length;
    const attempted = problems.filter((i) => statFor(progress, i.id).attempts > 0).length;
    const bestStreak = problems.reduce(
      (m, i) => Math.max(m, statFor(progress, i.id).bestStreak),
      0,
    );
    return [
      { icon: <BookOpen />, value: getTracks().length, label: 'Tracks' },
      { icon: <LayoutGrid />, value: getAllCategories().length, label: 'Categories' },
      { icon: <Code2 />, value: problems.length, label: 'Problems' },
      { icon: <Target />, value: attempted, label: 'Attempted' },
      { icon: <Trophy />, value: mastered, label: 'Mastered' },
      { icon: <Flame />, value: bestStreak, label: 'Best streak' },
    ];
  }, [progress]);

  return (
    <div
      aria-label="Your library"
      className={cn(
        'library-stats-rail flex h-8 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-edge bg-panel/30 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <span className="shrink-0 pr-1 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-ink3">
        Library
      </span>
      {stats.map((s) => (
        <span
          key={s.label}
          className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-edge/80 bg-panel2/35 px-2"
          title={`${s.value} ${s.label}`}
        >
          <span className="grid h-4 w-4 place-items-center text-accent/90 [&>svg]:h-3.5 [&>svg]:w-3.5">
            {s.icon}
          </span>
          <span className="font-mono text-xs font-semibold tabular-nums text-ink">{s.value}</span>
          <span className="hidden text-[length:var(--fs-2xs)] uppercase tracking-wide text-ink3 2xl:inline">
            {s.label}
          </span>
        </span>
      ))}
    </div>
  );
}
