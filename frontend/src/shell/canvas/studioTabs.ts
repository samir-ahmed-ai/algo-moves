import {
  AlertTriangle,
  Award,
  BookOpen,
  BookMarked,
  Code2,
  Crosshair,
  Eye,
  GalleryVerticalEnd,
  Gauge,
  GitCompareArrows,
  GraduationCap,
  HelpCircle,
  Keyboard,
  LayoutGrid,
  Lightbulb,
  ListOrdered,
  ListX,
  PenLine,
  Puzzle,
  Route,
  ScrollText,
  Sparkles,
  StepForward,
  StickyNote,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { STORAGE_KEYS } from '@/store/storageKeys';

/**
 * The Learn Studio is a single full-bleed surface with a grouped list of views.
 * Every view is driven by data the plugin already exposes (record/View/quiz/codePieces/
 * patterns/glossary/progress) — no new per-plugin authoring. Most views reuse the
 * existing `PanelBody(kind)` switch from PanelNode; the three "build" views reach the
 * CodeStudio phase components, and `assemble` opens the AssembleModes.
 */
export type StudioGroupId = 'start' | 'build' | 'practice' | 'trace' | 'reference' | 'progress';

/** How LearnStudio renders the tab body. */
export type StudioRender = 'overview' | 'quiz' | 'assemble' | 'recall' | 'panel';

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
  /** Full-bleed tabs that fill the Stage on their own (no Context Column). */
  wide?: boolean;
}

export interface StudioGroup {
  id: StudioGroupId;
  label: string;
}

export const STUDIO_GROUPS: StudioGroup[] = [
  { id: 'start', label: 'Start' },
  { id: 'build', label: 'Build & Recall' },
  { id: 'practice', label: 'Practice' },
  { id: 'trace', label: 'Trace the Run' },
  { id: 'reference', label: 'Reference' },
  { id: 'progress', label: 'Progress' },
];

export const STUDIO_TABS: StudioTab[] = [
  // Start
  { id: 'overview', label: 'Overview', icon: BookOpen, group: 'start', render: 'overview', wide: true },
  // Build & Recall
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, group: 'build', render: 'quiz', need: 'quiz' },
  { id: 'assemble', label: 'Assemble', icon: Puzzle, group: 'build', render: 'assemble', need: 'pieces', wide: true },
  { id: 'recall', label: 'Recall', icon: Keyboard, group: 'build', render: 'recall', need: 'source', wide: true },
  { id: 'source', label: 'Source', icon: Code2, group: 'build', render: 'panel', kind: 'copy', need: 'source' },
  // Practice
  { id: 'simulate', label: 'Simulate', icon: StepForward, group: 'practice', render: 'panel', kind: 'simulate' },
  { id: 'predict', label: 'Predict', icon: Lightbulb, group: 'practice', render: 'panel', kind: 'predict' },
  { id: 'complexity', label: 'Big-O quiz', icon: TrendingUp, group: 'practice', render: 'panel', kind: 'complexity' },
  { id: 'edgecases', label: 'Edge cases', icon: AlertTriangle, group: 'practice', render: 'panel', kind: 'edgecases' },
  { id: 'explain', label: 'Explain back', icon: PenLine, group: 'practice', render: 'panel', kind: 'explain' },
  { id: 'cases', label: 'Worked cases', icon: GalleryVerticalEnd, group: 'practice', render: 'panel', kind: 'cases' },
  // Trace the Run
  { id: 'board', label: 'Board', icon: LayoutGrid, group: 'trace', render: 'panel', kind: 'viz', wide: true },
  { id: 'replay', label: 'Replay', icon: ListOrdered, group: 'trace', render: 'panel', kind: 'replay' },
  { id: 'inspector', label: 'Inspector', icon: Crosshair, group: 'trace', render: 'panel', kind: 'inspector' },
  { id: 'diff', label: 'Frame diff', icon: GitCompareArrows, group: 'trace', render: 'panel', kind: 'diff' },
  { id: 'watch', label: 'Watch', icon: Eye, group: 'trace', render: 'panel', kind: 'watch' },
  { id: 'metrics', label: 'Metrics', icon: Gauge, group: 'trace', render: 'panel', kind: 'metrics' },
  // Reference
  { id: 'pattern', label: 'Pattern', icon: GraduationCap, group: 'reference', render: 'panel', kind: 'pattern' },
  { id: 'glossary', label: 'Glossary', icon: BookMarked, group: 'reference', render: 'panel', kind: 'glossary' },
  { id: 'hints', label: 'Hints', icon: Sparkles, group: 'reference', render: 'panel', kind: 'hints' },
  { id: 'cheatsheet', label: 'Cheat sheet', icon: ScrollText, group: 'reference', render: 'panel', kind: 'cheatsheet' },
  // Progress
  { id: 'mastery', label: 'Mastery', icon: Trophy, group: 'progress', render: 'panel', kind: 'mastery' },
  { id: 'mistakes', label: 'Mistake log', icon: ListX, group: 'progress', render: 'panel', kind: 'mistakes' },
  { id: 'badges', label: 'Badges', icon: Award, group: 'progress', render: 'panel', kind: 'badges' },
  { id: 'path', label: 'Learning path', icon: Route, group: 'progress', render: 'panel', kind: 'path' },
  { id: 'notes', label: 'Notes', icon: StickyNote, group: 'progress', render: 'panel', kind: 'notes' },
];

export const STUDIO_TAB_PERSIST = STORAGE_KEYS.STUDIO_TAB;

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
