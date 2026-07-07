import { type ReactNode } from 'react';
import { ArrowRight, BookOpen, Code2, Flame, LayoutGrid, Target, Trophy } from 'lucide-react';
import { FeatureSelectorPopover } from '@/components/shared';
import { getAllCategories, getTracks, type TrackId } from '../../content';
import type { FeatureGroup } from '@/components/shared';
import type { Item } from '../../content/types';
import { RoadmapCanvas } from './RoadmapCanvas';

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

function RailStat({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-edge bg-panel/60 px-3 py-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-panel2 text-accent [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-mono text-base font-semibold tabular-nums leading-none text-ink">
          {value}
        </div>
        <div className="mt-1 truncate text-[length:var(--fs-2xs)] uppercase tracking-wide text-ink3">
          {label}
        </div>
      </div>
    </div>
  );
}

function RailDetails({
  title,
  children,
  forceOpen,
}: {
  title: string;
  children: ReactNode;
  forceOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-xl border border-edge bg-panel/40 open:bg-panel/60 lg:border-0 lg:bg-transparent lg:open:bg-transparent [&_summary::-webkit-details-marker]:hidden"
      open={forceOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink3 transition-colors hover:text-ink lg:hidden">
        <span>{title}</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
      </summary>
      <div className="px-1 pb-3 pt-1 lg:contents">{children}</div>
    </details>
  );
}

export function LandingCatalogRail({
  problems,
  totals,
  isDesktop,
  specializedTrackGroups,
  lastTrackId,
  onTrackPick,
}: {
  problems: Item[];
  totals: { mastered: number; attempted: number; bestStreak: number };
  isDesktop: boolean;
  specializedTrackGroups: FeatureGroup[];
  lastTrackId: TrackId;
  onTrackPick: (id: TrackId) => void;
}) {
  return (
    <>
      <RailDetails title="Your library" forceOpen={isDesktop}>
        <p className="mb-2 hidden text-xs font-semibold uppercase tracking-[0.14em] text-ink3 lg:block">
          Your library
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
          <RailStat icon={<BookOpen />} value={getTracks().length} label="Tracks" />
          <RailStat icon={<LayoutGrid />} value={getAllCategories().length} label="Categories" />
          <RailStat icon={<Code2 />} value={problems.length} label="Problems" />
          <RailStat icon={<Target />} value={totals.attempted} label="Attempted" />
          <RailStat icon={<Trophy />} value={totals.mastered} label="Mastered" />
          <RailStat icon={<Flame />} value={totals.bestStreak} label="Best streak" />
        </div>
      </RailDetails>

      <div className="mt-auto lg:grid lg:grid-cols-2 lg:items-end lg:gap-3 lg:pt-2">
        <RailDetails title="Specialized tracks" forceOpen={isDesktop}>
          <p className="mb-2 hidden text-xs font-semibold uppercase tracking-[0.14em] text-ink3 lg:block">
            Specialized tracks
          </p>
          <FeatureSelectorPopover
            groups={specializedTrackGroups}
            value={lastTrackId}
            onChange={(id) => onTrackPick(id as TrackId)}
            panelTitle="Browse a specialized track"
            panelHint="Opens new tab"
            triggerLabel="Track"
            align="left"
            className="w-full"
          />
        </RailDetails>

        <div className="hidden space-y-4 lg:block">
          <div className="flex items-center gap-3 rounded-xl border border-edge bg-panel/60 p-3">
            {MAKER.photo ? (
              <img
                src={MAKER.photo}
                alt={MAKER.name}
                className="h-12 w-12 shrink-0 rounded-xl border border-edge object-cover object-top"
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
      </div>
    </>
  );
}

export function LandingCatalogRoadmap({
  problems,
  prepProblemCount,
  goConceptCount,
  openrtbConceptCount,
  onInterviewPrep,
  onProblems,
  onGo,
  onOpenrtb,
  onLearn,
  onVisualize,
  onVim,
  onGames,
}: {
  problems: Item[];
  prepProblemCount: number;
  goConceptCount: number;
  openrtbConceptCount: number;
  onInterviewPrep: () => void;
  onProblems: () => void;
  onGo: () => void;
  onOpenrtb: () => void;
  onLearn: () => void;
  onVisualize: () => void;
  onVim: () => void;
  onGames: () => void;
}) {
  return (
    <main id="roadmap" className="relative scroll-mt-14 bg-panel/20 lg:scroll-mt-0">
      <div
        aria-hidden
        className="landing-hero-glow pointer-events-none absolute inset-x-0 top-0 h-72 opacity-50 sm:h-96"
      />
      <div className="relative border-b border-edge px-[var(--hpad)] pt-3 text-center sm:px-6 sm:pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          The full system
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink sm:text-2xl">
          Follow the roadmap, move by move
        </h2>
        <p className="mx-auto mt-1 max-w-sm pb-2 text-sm leading-relaxed text-ink2 sm:pb-3">
          Every part of Algo Moves as one journey — from your first interview problem all the way to
          two-player games.
        </p>
      </div>
      <RoadmapCanvas
        prepProblemCount={prepProblemCount}
        problemsCount={problems.length}
        goConceptCount={goConceptCount}
        openrtbConceptCount={openrtbConceptCount}
        onInterviewPrep={onInterviewPrep}
        onProblems={onProblems}
        onGo={onGo}
        onOpenrtb={onOpenrtb}
        onLearn={onLearn}
        onVisualize={onVisualize}
        onVim={onVim}
        onGames={onGames}
      />
    </main>
  );
}
