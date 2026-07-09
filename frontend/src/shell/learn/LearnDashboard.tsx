import { useMemo, type ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Flame,
  GraduationCap,
  Home,
  Play,
  Trophy,
} from 'lucide-react';
import { catalog } from '@/content';
import { itemUnlocked } from '@/content/unlock';
import {
  useProgress,
  statFor,
  useSrsData,
  useActivity,
  computeDayStreak,
  activityHeatmap,
  activityTotals,
  useReadings,
  readFor,
} from '@/store/persistence';
import { useWorkspace } from '@/store/workspace';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { cn } from '@/lib/utils/cn';

/** "My Learning" — the personal home surfacing progress, reviews, streak, and mastery. */
export function LearnDashboard() {
  const { goHome, openProblem } = useWorkspace();
  const progress = useProgress();
  const srs = useSrsData();
  const activity = useActivity();
  const readings = useReadings();

  const isMastered = (id: string): boolean =>
    statFor(progress, id).mastered || readFor(readings, id);

  const now = Date.now();
  const dueCards = useMemo(
    () =>
      Object.values(srs.cards)
        .filter((c) => c.due <= now)
        .sort((a, b) => a.due - b.due),
    [srs, now],
  );
  const streak = computeDayStreak(activity.days);
  const totals = activityTotals(activity.days);

  const courseStats = useMemo(
    () =>
      catalog.courses
        .map((c) => {
          const items = c.topics
            .flatMap((t) => t.items)
            .filter((it) => it.pluginId || it.kind === 'reading' || it.kind === 'quiz');
          const mastered = items.filter((it) => isMastered(it.id)).length;
          return { course: c, total: items.length, mastered };
        })
        .filter((cs) => cs.total > 0)
        .sort((a, b) => b.mastered / b.total - a.mastered / a.total),

    [progress, readings],
  );

  const recommended = useMemo(
    () =>
      catalog.items.find(
        (it) => !!it.pluginId && !isMastered(it.id) && itemUnlocked(it.id, isMastered),
      ),

    [progress, readings],
  );

  const lastItemId =
    typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.LAST_ITEM) : null;
  const continueItem = lastItemId ? catalog.getItem(lastItemId) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <header className="flex shrink-0 items-center gap-2 border-b border-edge px-4 py-3">
        <button
          type="button"
          onClick={goHome}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-ink3 hover:text-ink"
        >
          <Home className="h-3.5 w-3.5" />
          Home
        </button>
        <span className="text-edge">/</span>
        <GraduationCap className="h-4 w-4 text-accent" />
        <h1 className="text-sm font-semibold text-ink">My Learning</h1>
      </header>

      <div className="ws-scroll min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 py-6">
          {/* Top stat row */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              icon={<Flame className="h-5 w-5 text-warn" />}
              value={String(streak)}
              label={streak === 1 ? 'day streak' : 'day streak'}
              hint={`${totals.activeDays} active days`}
            />
            <button
              type="button"
              onClick={() => dueCards[0] && openProblem(dueCards[0].problemId)}
              disabled={dueCards.length === 0}
              className="text-left"
            >
              <StatTile
                icon={<Play className="h-5 w-5 text-accent" />}
                value={String(dueCards.length)}
                label="reviews due"
                hint={dueCards.length ? 'Start review →' : 'All caught up'}
                accent={dueCards.length > 0}
              />
            </button>
            <StatTile
              icon={<Trophy className="h-5 w-5 text-good" />}
              value={String(courseStats.reduce((n, cs) => n + cs.mastered, 0))}
              label="mastered"
              hint={`across ${courseStats.length} courses`}
            />
          </div>

          {/* Continue */}
          {continueItem && (
            <Card title="Continue where you left off" icon={<BookOpen className="h-4 w-4" />}>
              <RowButton
                title={continueItem.title}
                subtitle={continueItem.courseId}
                onClick={() => openProblem(continueItem.id)}
              />
            </Card>
          )}

          {/* Recommended next */}
          {recommended && (
            <Card title="Recommended next" icon={<ArrowRight className="h-4 w-4" />}>
              <RowButton
                title={recommended.title}
                subtitle={`${recommended.courseId} · unlocked`}
                onClick={() => openProblem(recommended.id)}
              />
            </Card>
          )}

          {/* Activity heatmap */}
          <Card title="Activity" icon={<CalendarDays className="h-4 w-4" />}>
            <Heatmap days={activity.days} />
          </Card>

          {/* Course mastery rollup */}
          <Card title="Course progress" icon={<GraduationCap className="h-4 w-4" />}>
            <div className="flex flex-col gap-2.5">
              {courseStats.map((cs) => (
                <div key={cs.course.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      cs.course.topics[0]?.items[0] && openProblem(cs.course.topics[0].items[0].id)
                    }
                    className="w-40 shrink-0 truncate text-left text-sm text-ink hover:text-accent"
                  >
                    {cs.course.title}
                  </button>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel2">
                    <div
                      className="h-full rounded-full bg-good transition-[width]"
                      style={{ width: `${Math.round((cs.mastered / cs.total) * 100)}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-mono text-xs text-ink3">
                    {cs.mastered}/{cs.total}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
  hint,
  accent,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3',
        accent ? 'border-accent/40 bg-accent/5' : 'border-edge bg-panel2',
      )}
    >
      {icon}
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-none text-ink">{value}</div>
        <div className="text-xs text-ink2">{label}</div>
      </div>
      {hint && <span className="ml-auto text-right text-xs text-ink3">{hint}</span>}
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-edge bg-panel p-4">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink3">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function RowButton({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg border border-edge bg-panel2 px-3 py-2.5 text-left transition-colors hover:border-accent"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{title}</span>
        <span className="block truncate text-xs text-ink3">{subtitle}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-accent" />
    </button>
  );
}

function Heatmap({ days }: { days: Record<string, number> }) {
  const grid = activityHeatmap(days, 20);
  const level = (count: number): string => {
    if (count <= 0) return 'bg-panel2';
    if (count < 3) return 'bg-good/40';
    if (count < 6) return 'bg-good/70';
    return 'bg-good';
  };
  return (
    <div className="flex gap-1 overflow-x-auto">
      {grid.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-1">
          {col.map((cell) => (
            <div
              key={cell.date}
              title={`${cell.date}: ${cell.count}`}
              className={cn('h-2.5 w-2.5 rounded-sm', level(cell.count))}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
