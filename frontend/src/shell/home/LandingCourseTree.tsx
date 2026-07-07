import { Eye, LayoutGrid } from 'lucide-react';
import type { Item, TrackId } from '../../content';
import { CourseTree } from '../browse/CourseTree';

type OpenMode = 'learn' | 'visualize';

export interface LandingCourseTreeProps {
  /** Open a problem in the workspace in the given mode. */
  onOpenProblem: (itemId: string, mode: OpenMode) => void;
  /** Open a track's category grid in the workspace. */
  onOpenTrack: (trackId: TrackId) => void;
}

export function LandingCourseTree({ onOpenProblem, onOpenTrack }: LandingCourseTreeProps) {
  return (
    <CourseTree
      className="px-[var(--hpad)] py-3 sm:px-4"
      storageKey="algo.landing.courseTree"
      showBulkToggle
      onProblem={(item: Item) => onOpenProblem(item.id, 'learn')}
      trackAccessory={(trackId) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTrack(trackId as TrackId);
          }}
          aria-label="View all problems"
          title="View all problems"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink3 opacity-70 transition-all hover:bg-panel2 hover:text-accent"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
      )}
      problemAccessory={(item: Item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenProblem(item.id, 'visualize');
          }}
          aria-label={`Visualize ${item.title}`}
          title="Open in Visualize"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink3 opacity-70 transition-all hover:bg-panel2 hover:text-accent group-hover/row:opacity-100"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      )}
    />
  );
}
