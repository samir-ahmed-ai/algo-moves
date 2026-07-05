import type { ComponentType } from 'react';
import { useInterviewVisibility } from '@/shell/study/visibility/useInterviewVisibility';
import { BigOPanelBody } from './visualize/BigOPanelBody';
import { BookmarksPanelBody } from './workspace/BookmarksPanelBody';
import { CopyPanelBody } from './code/CopyPanelBody';
import { EditorPanelBody } from './code/EditorPanelBody';
import { InspectorPanelBody } from './visualize/InspectorPanelBody';
import { MetricsBody } from './visualize/MetricsPanelBody';
import { NotesPanelBody } from './workspace/NotesPanelBody';
import { WhiteboardPanelBody } from './visualize/WhiteboardPanelBody';
import { CollabEditorPanelBody } from '@/shell/study/CollabCodeStudio';
import { ProblemPanelBody } from './problem/ProblemPanelBody';
import { VizPanelBody } from './visualize/VizPanelBody';
import { ProjectsPanelBody } from './workspace/ProjectsPanelBody';
import { ReplayPanelBody } from './visualize/ReplayPanelBody';
import { BadgesPanelBody } from './practice/BadgesPanelBody';
import { ComplexityPanelBody } from './practice/ComplexityPanelBody';
import { EdgeCasesPanelBody } from './practice/EdgeCasesPanelBody';
import { ExplainPanelBody } from './practice/ExplainPanelBody';
import { MasteryPanelBody } from './practice/MasteryPanelBody';
import { MistakesPanelBody } from './practice/MistakesPanelBody';
import { PredictPanelBody } from './practice/PredictPanelBody';
import { CheatPanelBody } from './reference/CheatPanelBody';
import { DiffPanelBody } from './reference/DiffPanelBody';
import { GlossaryPanelBody } from './reference/GlossaryPanelBody';
import { HintsPanelBody } from './reference/HintsPanelBody';
import { PathPanelBody } from './reference/PathPanelBody';
import { PatternPanelBody } from './reference/PatternPanelBody';
import { WatchPanelBody } from './reference/WatchPanelBody';
import { TabBody } from './shared/TabBody';

/** Panels whose content is rendered elsewhere (e.g. Code Studio node) render nothing here.
 *  NullBody kinds with chrome metadata in core/panelNodeChrome.ts: workbench, code, scratch. */
const NullBody: ComponentType = () => null;

/**
 * Registry mapping a panel `kind` to its body component — the single dispatch
 * table for PanelBody. Add a panel by adding one entry here (plus its metadata in
 * core/panelRegistry `panelsConfig`); unregistered kinds fall back to <TabBody>.
 */
export const PANEL_BODIES: Record<string, ComponentType> = {
  workbench: NullBody,
  problem: ProblemPanelBody,
  viz: VizPanelBody,
  replay: ReplayPanelBody,
  inspector: InspectorPanelBody,
  metrics: MetricsBody,
  bigo: BigOPanelBody,
  predict: PredictPanelBody,
  mastery: MasteryPanelBody,
  mistakes: MistakesPanelBody,
  explain: ExplainPanelBody,
  badges: BadgesPanelBody,
  bookmarks: BookmarksPanelBody,
  editor: EditorPanelBody,
  pattern: PatternPanelBody,
  glossary: GlossaryPanelBody,
  diff: DiffPanelBody,
  watch: WatchPanelBody,
  hints: HintsPanelBody,
  path: PathPanelBody,
  cheatsheet: CheatPanelBody,
  projects: ProjectsPanelBody,
  notes: NotesPanelBody,
  whiteboard: WhiteboardPanelBody,
  'collab-code': CollabEditorPanelBody,
  complexity: ComplexityPanelBody,
  edgecases: EdgeCasesPanelBody,
  copy: CopyPanelBody,
  code: NullBody,
  scratch: NullBody,
};

export function PanelBody({ kind }: { kind: string }) {
  const visibility = useInterviewVisibility(kind);
  if (visibility === 'hidden') return null;
  const Body = PANEL_BODIES[kind];
  return Body ? <Body /> : <TabBody kind={kind} />;
}
