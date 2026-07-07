import { useMemo, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  catalog,
  getCategoriesForTrack,
  getCategoryById,
  getItemsForCategory,
  getTrackById,
  type TrackId,
} from '../../content';
import { useProgress, statFor } from '@/store/persistence';
import { Label } from '@/shell/canvas';
import { Meter } from '@/design/components';
import { cn } from '@/lib/utils/cn';
import { courseIcon } from '../courseIcon';
import { chromeText } from '../chromeUi';
import { trackColor } from './trackColors';

const gridStyle = {
  backgroundImage:
    'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
  backgroundSize: '16px 16px',
} as const;

export function BrowseBreadcrumb({
  trackId,
  categoryId,
  onBack,
  backTitle = 'Back',
  trailing,
  description,
  className,
}: {
  trackId?: TrackId | null;
  categoryId?: string | null;
  onBack: () => void;
  /** Tooltip / aria-label for the back button. */
  backTitle?: string;
  trailing?: ReactNode;
  description?: string;
  className?: string;
}) {
  const progress = useProgress();
  const track = trackId ? getTrackById(trackId) : undefined;
  const category = categoryId ? getCategoryById(categoryId) : undefined;

  const trackCategories = useMemo(() => (trackId ? getCategoriesForTrack(trackId) : []), [trackId]);
  const trackItems = useMemo(
    () => trackCategories.flatMap((cat) => getItemsForCategory(cat.id, catalog)),
    [trackCategories],
  );
  const trackTotal = trackItems.length;
  const trackMastered = trackItems.filter((i) => statFor(progress, i.id).mastered).length;

  const categoryItems = categoryId ? getItemsForCategory(categoryId, catalog) : [];
  const categoryTotal = categoryItems.length;

  if (!track && !category) return null;

  const color = trackId ? trackColor(trackId) : trackColor('data-structures');
  const Icon = courseIcon(category?.icon ?? track?.icon);
  const title = category?.title ?? track?.title ?? 'Browse';
  const summary = category?.summary ?? track?.summary;

  const label = category
    ? `${track?.title ? `${track.title} · ` : ''}${categoryTotal} ${categoryTotal === 1 ? 'PROBLEM' : 'PROBLEMS'}`
    : `PICK A CATEGORY · ${trackCategories.length} ${trackCategories.length === 1 ? 'TOPIC' : 'TOPICS'} · ${trackTotal} ${trackTotal === 1 ? 'PROBLEM' : 'PROBLEMS'}`;

  const defaultTrailing =
    !trailing && !category && trackTotal > 0 ? (
      <div className="relative ml-auto flex shrink-0 flex-col items-end gap-1">
        <div className="w-24">
          <Meter value={trackMastered} max={Math.max(trackTotal, 1)} tone="good" height={4} />
        </div>
        <span className={cn('font-mono tabular-nums text-ink3', chromeText.sm)}>
          {trackMastered}/{trackTotal} mastered
        </span>
      </div>
    ) : (
      trailing
    );

  return (
    <div
      className={cn(
        'relative mb-3 flex items-center gap-[var(--gap)] overflow-hidden rounded-lg border border-edge bg-panel px-[var(--hpad)] py-[var(--pad)]',
        className,
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: color.c1 }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg opacity-[0.3] [mask-image:radial-gradient(120%_120%_at_0_0,black,transparent)]"
        style={gridStyle}
      />

      <button
        type="button"
        onClick={onBack}
        aria-label={backTitle}
        title={backTitle}
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md border border-edge bg-panel2 text-ink2 transition-colors hover:bg-panel hover:text-ink"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <span
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md text-white shadow-[var(--shadow-sm)] [&>svg]:h-[18px] [&>svg]:w-[18px]"
        style={{ background: `linear-gradient(135deg, ${color.c1}, ${color.c2})` }}
      >
        <Icon strokeWidth={1.6} />
      </span>

      <div className="relative min-w-0 flex-1">
        <Label className="font-mono tracking-[0.12em]">{label}</Label>
        <h2 className={cn('truncate font-medium text-ink', chromeText.base)}>{title}</h2>
        {summary && (
          <p className={cn('mt-0.5 line-clamp-2 text-ink2', chromeText.tight)}>{summary}</p>
        )}
        {description && (
          <p className={cn('mt-1.5 max-w-3xl leading-relaxed text-ink2', chromeText.sm)}>
            {description}
          </p>
        )}
      </div>

      {defaultTrailing}
    </div>
  );
}
