import {
  Award,
  BookOpen,
  Code2,
  GalleryVerticalEnd,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  ListX,
  Puzzle,
  Route,
  ScrollText,
  StepForward,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';
import { STORAGE_KEYS } from '@/store/storageKeys';

/**
 * The Learn Studio is a single full-bleed surface with a grouped view picker in the
 * top bar. Every view is driven by data the plugin already exposes (record/View/quiz/
 * codePieces/patterns/progress) — no new per-plugin authoring.
 */
export type StudioGroupId = 'start' | 'build' | 'practice' | 'reference' | 'progress';

/** How LearnStudio renders the tab body. */
export type StudioRender = 'overview' | 'quiz' | 'assemble' | 'panel';

/** A tab is hidden unless the underlying studio data is present. */
export type StudioNeed = 'quiz' | 'pieces' | 'source';

export interface StudioTab {
  id: string;
  label: string;
  icon: LucideIcon;
  group: StudioGroupId;
  render: StudioRender;
  /** PanelBody kind for `render: 'panel'` tabs. */
  kind?: string;
  need?: StudioNeed;
}

export interface StudioGroup {
  id: StudioGroupId;
  label: string;
}

export const STUDIO_GROUPS: StudioGroup[] = [
  { id: 'start', label: 'Start' },
  { id: 'build', label: 'Build & Recall' },
  { id: 'practice', label: 'Practice' },
  { id: 'reference', label: 'Reference' },
  { id: 'progress', label: 'Progress' },
];

export const STUDIO_TABS: StudioTab[] = [
  // Start
  { id: 'overview', label: 'Overview', icon: BookOpen, group: 'start', render: 'overview' },
  // Build & Recall
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, group: 'build', render: 'quiz', need: 'quiz' },
  {
    id: 'assemble',
    label: 'Assemble',
    icon: Puzzle,
    group: 'build',
    render: 'assemble',
    need: 'pieces',
  },
  {
    id: 'source',
    label: 'Source',
    icon: Code2,
    group: 'build',
    render: 'panel',
    kind: 'copy',
    need: 'source',
  },
  // Practice
  {
    id: 'simulate',
    label: 'Simulate',
    icon: StepForward,
    group: 'practice',
    render: 'panel',
    kind: 'simulate',
  },
  {
    id: 'predict',
    label: 'Predict',
    icon: Lightbulb,
    group: 'practice',
    render: 'panel',
    kind: 'predict',
  },
  {
    id: 'cases',
    label: 'Worked cases',
    icon: GalleryVerticalEnd,
    group: 'practice',
    render: 'panel',
    kind: 'cases',
  },
  // Reference
  {
    id: 'pattern',
    label: 'Pattern',
    icon: GraduationCap,
    group: 'reference',
    render: 'panel',
    kind: 'pattern',
  },
  {
    id: 'cheatsheet',
    label: 'Cheat sheet',
    icon: ScrollText,
    group: 'reference',
    render: 'panel',
    kind: 'cheatsheet',
  },
  // Progress
  {
    id: 'mistakes',
    label: 'Mistake log',
    icon: ListX,
    group: 'progress',
    render: 'panel',
    kind: 'mistakes',
  },
  {
    id: 'badges',
    label: 'Badges',
    icon: Award,
    group: 'progress',
    render: 'panel',
    kind: 'badges',
  },
  {
    id: 'path',
    label: 'Learning path',
    icon: Route,
    group: 'progress',
    render: 'panel',
    kind: 'path',
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: StickyNote,
    group: 'progress',
    render: 'panel',
    kind: 'notes',
  },
];

export const STUDIO_TAB_PERSIST = STORAGE_KEYS.STUDIO_TAB;

/**
 * Tab id for the standalone Assemble stage. The Quiz stage runs reassemble inline and
 * hands off past this tab, so both sites reference this constant instead of a bare
 * string literal.
 */
export const ASSEMBLE_TAB_ID = 'assemble';

export interface StudioAvailability {
  hasQuiz: boolean;
  hasPieces: boolean;
  hasSource: boolean;
}

export function isTabAvailable(tab: StudioTab, a: StudioAvailability): boolean {
  if (tab.need === 'quiz') return a.hasQuiz;
  if (tab.need === 'pieces') return a.hasPieces;
  if (tab.need === 'source') return a.hasSource;
  return true;
}

/**
 * Canonical order (group by group, view by view). STUDIO_TABS is already authored in
 * this order, so the ids map straight through; `flatOrder` intersects it with the
 * AVAILABLE views at runtime to drive "Next" navigation.
 */
export const ARC_ORDER: string[] = STUDIO_TABS.map((t) => t.id);

/** Available views in canonical order. */
export function flatOrder(avail: StudioTab[]): StudioTab[] {
  return [...avail].sort((a, b) => ARC_ORDER.indexOf(a.id) - ARC_ORDER.indexOf(b.id));
}

/**
 * The primary learning spine — the groups that form the core arc a learner walks
 * (Overview → Quiz → Assemble → Source). Everything else (Practice / Reference /
 * Progress) is reachable from a "More views" overflow, not the always-visible arc.
 */
export const ARC_GROUPS: StudioGroupId[] = ['start', 'build'];

export function isArcTab(tab: StudioTab): boolean {
  return ARC_GROUPS.includes(tab.group);
}

/** Available primary-arc tabs in canonical order. */
export function arcTabs(avail: StudioTab[]): StudioTab[] {
  return flatOrder(avail).filter(isArcTab);
}

/** Available secondary ("More views") tabs in canonical order. */
export function moreTabs(avail: StudioTab[]): StudioTab[] {
  return flatOrder(avail).filter((t) => !isArcTab(t));
}
