import { BigOPanelBody } from './BigOPanelBody';
import { BookmarksPanelBody } from './BookmarksPanelBody';
import { CopyPanelBody } from './CopyPanelBody';
import { EditorPanelBody } from './EditorPanelBody';
import { ExamplesPanelBody } from './ExamplesPanelBody';
import { InspectorPanelBody } from './InspectorPanelBody';
import { MetricsBody } from './MetricsPanelBody';
import { NotesPanelBody } from './NotesPanelBody';
import { ProblemPanelBody } from './ProblemPanelBody';
import { ProjectsPanelBody } from './ProjectsPanelBody';
import { ReplayPanelBody } from './ReplayPanelBody';
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

export function PanelBody({ kind }: { kind: string }) {
  switch (kind) {
    case 'examples':
      return <ExamplesPanelBody />;
    case 'problem':
      return <ProblemPanelBody />;
    case 'replay':
      return <ReplayPanelBody />;
    case 'inspector':
      return <InspectorPanelBody />;
    case 'metrics':
      return <MetricsBody />;
    case 'bigo':
      return <BigOPanelBody />;
    case 'predict':
      return <PredictPanelBody />;
    case 'mastery':
      return <MasteryPanelBody />;
    case 'mistakes':
      return <MistakesPanelBody />;
    case 'explain':
      return <ExplainPanelBody />;
    case 'badges':
      return <BadgesPanelBody />;
    case 'bookmarks':
      return <BookmarksPanelBody />;
    case 'editor':
      return <EditorPanelBody />;
    case 'pattern':
      return <PatternPanelBody />;
    case 'glossary':
      return <GlossaryPanelBody />;
    case 'diff':
      return <DiffPanelBody />;
    case 'watch':
      return <WatchPanelBody />;
    case 'hints':
      return <HintsPanelBody />;
    case 'path':
      return <PathPanelBody />;
    case 'cheatsheet':
      return <CheatPanelBody />;
    case 'projects':
      return <ProjectsPanelBody />;
    case 'notes':
      return <NotesPanelBody />;
    case 'complexity':
      return <ComplexityPanelBody />;
    case 'edgecases':
      return <EdgeCasesPanelBody />;
    case 'code':
    case 'scratch':
      return null;
    case 'copy':
      return <CopyPanelBody />;
    default:
      return <TabBody kind={kind} />;
  }
}
