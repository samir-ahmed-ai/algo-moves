import type { ReactNode } from 'react';
import {
  Network,
  Activity,
  ScanSearch,
  BarChart3,
  TrendingUp,
  Copy,
  ListChecks,
  HelpCircle,
  Gamepad2,
  Lightbulb,
  Pencil,
  Trophy,
  AlertTriangle,
  PenLine,
  Puzzle,
  PencilLine,
  Users,
  Award,
  GraduationCap,
  Keyboard,
  BookMarked,
  GitCompare,
  LineChart,
  Route,
  ScrollText,
  FolderOpen,
  StickyNote,
  Bookmark,
  Columns2,
  FileQuestion,
  FileText,
  LayoutPanelLeft,
} from 'lucide-react';

const PANEL_ICON = 'size-[var(--node-icon,1.125rem)]';

const ICON: Record<string, ReactNode> = {
  workbench: <LayoutPanelLeft className={PANEL_ICON} />,
  problem: <FileText className={PANEL_ICON} />,
  viz: <Network className={PANEL_ICON} />,
  replay: <Activity className={PANEL_ICON} />,
  inspector: <ScanSearch className={PANEL_ICON} />,
  metrics: <BarChart3 className={PANEL_ICON} />,
  bigo: <TrendingUp className={PANEL_ICON} />,
  bookmarks: <Bookmark className={PANEL_ICON} />,
  editor: <Pencil className={PANEL_ICON} />,
  copy: <Copy className={PANEL_ICON} />,
  cases: <ListChecks className={PANEL_ICON} />,
  code: <Columns2 className={PANEL_ICON} />,
  reassemble: <Puzzle className={PANEL_ICON} />,
  recall: <Keyboard className={PANEL_ICON} />,
  quiz: <HelpCircle className={PANEL_ICON} />,
  simulate: <Gamepad2 className={PANEL_ICON} />,
  predict: <Lightbulb className={PANEL_ICON} />,
  mastery: <Trophy className={PANEL_ICON} />,
  mistakes: <AlertTriangle className={PANEL_ICON} />,
  explain: <PenLine className={PANEL_ICON} />,
  badges: <Award className={PANEL_ICON} />,
  pattern: <GraduationCap className={PANEL_ICON} />,
  glossary: <BookMarked className={PANEL_ICON} />,
  diff: <GitCompare className={PANEL_ICON} />,
  watch: <LineChart className={PANEL_ICON} />,
  hints: <HelpCircle className={PANEL_ICON} />,
  path: <Route className={PANEL_ICON} />,
  cheatsheet: <ScrollText className={PANEL_ICON} />,
  projects: <FolderOpen className={PANEL_ICON} />,
  notes: <StickyNote className={PANEL_ICON} />,
  whiteboard: <PencilLine className={PANEL_ICON} />,
  'collab-code': <Users className={PANEL_ICON} />,
  complexity: <TrendingUp className={PANEL_ICON} />,
  edgecases: <AlertTriangle className={PANEL_ICON} />,
};

export { panelAccent } from '@/core/panelAccent';

/** The per-kind glyph, for chrome that lists nodes (e.g. the Add-panel menu). */
export function nodeIcon(kind: string): ReactNode {
  return ICON[kind] ?? <FileQuestion className={PANEL_ICON} />;
}

/** Panel kind icon map — used by PanelNodeHeader. */
export function panelKindIcon(kind: string): ReactNode {
  return ICON[kind] ?? <FileQuestion className={PANEL_ICON} />;
}
