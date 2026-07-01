import { ChevronLeft } from 'lucide-react';
import { getCategoryById, getTrackById, type TrackId } from '../../content';
import { cn } from '../../lib/cn';
import { chromeText } from '../chromeUi';

export function BrowseBreadcrumb({
  trackId,
  categoryId,
  onBack,
}: {
  trackId?: TrackId | null;
  categoryId?: string | null;
  onBack: () => void;
}) {
  const track = trackId ? getTrackById(trackId) : undefined;
  const category = categoryId ? getCategoryById(categoryId) : undefined;

  if (!track && !category) return null;

  return (
    <div className="mb-3 flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-md border border-edge px-2 py-1 text-ink2 transition-colors hover:bg-panel2 hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className={chromeText.sm}>Back</span>
      </button>
      <nav className={cn('min-w-0 truncate text-ink3', chromeText.sm)} aria-label="Browse path">
        {track && <span className="text-ink2">{track.title}</span>}
        {track && category && <span className="mx-1.5 text-ink3">›</span>}
        {category && <span className="font-medium text-ink">{category.title}</span>}
      </nav>
    </div>
  );
}
