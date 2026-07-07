import { Eye, LayoutGrid } from 'lucide-react';
import type { Item, TrackId } from '../../content';
import { CourseTree } from '../browse/CourseTree';

type OpenMode = 'learn' | 'visualize';
const ACCESSORY_BUTTON =
  'grid shrink-0 place-items-center rounded-full border border-transparent bg-panel/40 text-ink3 opacity-75 shadow-theme-sm transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:bg-accentbg hover:text-accent hover:shadow-theme-md focus-visible:opacity-100 group-hover/row:opacity-100';

export interface LandingCourseTreeProps {
  /** Open a problem in the workspace in the given mode. */
  onOpenProblem: (itemId: string, mode: OpenMode) => void;
  /** Open a track's category grid in the workspace. */
  onOpenTrack: (trackId: TrackId) => void;
}

export function LandingCourseTree({ onOpenProblem, onOpenTrack }: LandingCourseTreeProps) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-edge to-transparent"
      />
      <CourseTree
        className="px-[var(--hpad)] py-4 sm:px-5"
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
            aria-label="View all problems in this track"
            title="View all problems"
            className={`${ACCESSORY_BUTTON} h-7 w-7`}
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
            className={`${ACCESSORY_BUTTON} h-6 w-6`}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}
      />
    </div>
  );
}
