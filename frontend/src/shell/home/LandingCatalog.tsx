import { ArrowRight } from 'lucide-react';
import { VimHeroPreview } from '@/shell/vim/ui/VimHeroPreview';
import type { TrackId } from '../../content';
import { LandingCourseTree } from './LandingCourseTree';

interface Maker {
  name: string;
  role: string;
  photo?: string;
  email?: string;
}

const MAKER: Maker = {
  name: 'Ahmed Abdelmaaboud',
  role: 'Creator & Senior Go Engineer',
  photo: `${import.meta.env.BASE_URL}assets/ahmed.png`,
  email: 'ahmed.amer.samir@gmail.com',
};

export function LandingCatalogRail({ onVim }: { onVim: () => void }) {
  return (
    <div className="mt-auto hidden space-y-4 lg:block lg:pt-2">
      <button
        type="button"
        onClick={() => onVim()}
        aria-label="Open Vim Dojo"
        className="group flex w-full flex-col gap-3 rounded-lg border border-edge bg-panel/70 p-3 text-left shadow-[var(--shadow-sm)] transition-all hover:border-accent/50 hover:bg-panel"
      >
        <VimHeroPreview />
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Vim Dojo</span>
            <span className="block text-xs text-ink3">Timed keyboard-motion drills</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-ink3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>
      <div className="flex items-center gap-3 rounded-lg border border-edge bg-panel/70 p-3 shadow-[var(--shadow-sm)]">
        {MAKER.photo ? (
          <img
            src={MAKER.photo}
            alt={MAKER.name}
            className="h-12 w-12 shrink-0 rounded-lg border border-edge object-cover object-top"
          />
        ) : null}
        <div className="min-w-0">
          <p className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-accent">
            {MAKER.role}
          </p>
          <p className="truncate text-sm font-semibold text-ink">{MAKER.name}</p>
          {MAKER.email ? (
            <a
              href={`mailto:${MAKER.email}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent transition-opacity hover:opacity-70"
            >
              {MAKER.email}
            </a>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-ink3">
        Algo Moves — step through interview algorithms until they stick.
      </p>
    </div>
  );
}

export function LandingCatalogRoadmap({
  onOpenProblem,
  onOpenTrack,
}: {
  onOpenProblem: (itemId: string, mode: 'learn' | 'visualize') => void;
  onOpenTrack: (trackId: TrackId) => void;
}) {
  return (
    <main id="roadmap" className="relative scroll-mt-14 bg-panel/20 lg:scroll-mt-0">
      <div
        aria-hidden
        className="landing-hero-glow pointer-events-none absolute inset-x-0 top-0 h-72 opacity-50 sm:h-96"
      />
      <div className="relative border-b border-edge px-[var(--hpad)] pt-3 text-center sm:px-6 sm:pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          The full library
        </p>
        <h2 className="mt-1 text-lg font-semibold text-ink sm:text-2xl">
          Every course, subtopic, and problem
        </h2>
        <p className="mx-auto mt-1 max-w-sm pb-2 text-sm leading-relaxed text-ink2 sm:pb-3">
          Expand a course to drill into its subtopics and problems — open any problem in Learn or
          Visualize.
        </p>
      </div>
      <LandingCourseTree onOpenProblem={onOpenProblem} onOpenTrack={onOpenTrack} />
    </main>
  );
}
