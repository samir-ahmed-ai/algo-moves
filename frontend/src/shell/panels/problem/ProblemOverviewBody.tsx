import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { HighlightedCode } from '@/components/code/HighlightedCode';
import { ConceptText, conceptFromPlugin } from '@/components/shared/ConceptText';
import { isTextOnlyCourse } from '@/lib/canvas/conceptCourse';
import { Chip, difficultyTone, NodeTagChip, useCanvasFrame, useCanvasStatic } from '@/shell/canvas';
import { ProblemPanelBody } from './ProblemPanelBody';
import {
  OverviewContentColumn,
  OverviewProblemColumn,
  ProblemStatementColumn,
} from './overviewColumns';
import { INSPECTOR_TABS, StudioInspectorRail, StudioPanelDock } from './StudioInspectorRail';
import { StudioNextFooter } from './StudioNextFooter';
import { StudioContentPanel, StudioSplitLayout } from './studioSplitLayout';
import { useOverviewView } from './useOverviewView';
import { useStudioNextShortcut } from './useStudioNextShortcut';
import { useCodeStudioContent } from '@/shell/study/CodeStudio';

interface OverviewNav {
  nextLabel?: string | undefined;
  onNext?: (() => void) | undefined;
  nextAllLabel?: string | undefined;
  onNextAll?: (() => void) | undefined;
}

/**
 * Learn Overview. Recall-first (text-only) courses like the Go Course get a
 * static concept-text + sample-code layout with no animation; every other
 * problem keeps the live animation board.
 */
export function ProblemOverviewBody(props: OverviewNav = {}) {
  const { item } = useCanvasStatic();
  return isTextOnlyCourse(item.courseId) ? (
    <ConceptReadOverview {...props} />
  ) : (
    <AnimatedOverviewBody {...props} />
  );
}

/** Text-only Overview: concept walkthrough as prose beside the syntax-colored sample code. */
function ConceptReadOverview({ nextLabel, onNext, nextAllLabel, onNextAll }: OverviewNav) {
  const { item, plugin } = useCanvasStatic();
  const isMobile = useIsMobile();
  const concept = conceptFromPlugin(plugin);
  const code = plugin.code?.text?.trim() ?? '';
  const lang = plugin.code?.lang ?? 'go';
  const tone = difficultyTone(item.difficulty);
  useStudioNextShortcut(onNext, onNextAll);

  return (
    <StudioSplitLayout
      footer={
        <StudioNextFooter
          nextLabel={nextLabel}
          onNext={onNext}
          nextAllLabel={nextAllLabel}
          onNextAll={onNextAll}
        />
      }
      problem={
        <ProblemStatementColumn
          className={cn(
            'concept-read-overview',
            isMobile && 'max-h-[min(40vh,50%)] min-h-0 border-b border-edge',
          )}
        >
          <div className="flex flex-col gap-3">
            <header className="concept-read-overview__header flex flex-col gap-2">
              <div className="flex flex-wrap items-start gap-2">
                <h2 className="min-w-0 flex-1 text-[length:var(--fs-title)] font-semibold leading-tight text-ink">
                  {item.title}
                </h2>
                {item.difficulty && <Chip tone={tone}>{item.difficulty}</Chip>}
              </div>
              {item.summary && (
                <p className="text-[length:var(--fs-sm)] leading-relaxed text-ink3">
                  {item.summary}
                </p>
              )}
              {(concept.pattern || item.tags.length > 0) && (
                <div className="concept-read-overview__tags flex flex-wrap gap-1.5">
                  {concept.pattern && (
                    <span className="concept-pattern-chip inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accentbg px-2.5 py-1 text-[length:var(--fs-xs)] font-semibold text-accent">
                      <Sparkles className="h-3.5 w-3.5" />
                      {concept.pattern}
                    </span>
                  )}
                  {item.tags.map((t) => (
                    <NodeTagChip key={t} id={t} />
                  ))}
                </div>
              )}
            </header>
            <ConceptText concept={concept} />
          </div>
        </ProblemStatementColumn>
      }
      second={
        <StudioContentPanel>
          {code ? (
            <div className="source-code-frame flex min-h-0 flex-1 overflow-hidden">
              <HighlightedCode
                code={code}
                lang={lang}
                gutter
                className="ws-scroll min-h-0 flex-1 overflow-auto p-3 font-mono sm:p-4"
              />
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 place-items-center p-6 text-[length:var(--fs-sm)] text-ink3">
              No sample code for this concept.
            </div>
          )}
        </StudioContentPanel>
      }
    />
  );
}

/** Learn Overview tab — problem statement beside the live animation board. */
function AnimatedOverviewBody({ nextLabel, onNext, nextAllLabel, onNextAll }: OverviewNav = {}) {
  const isMobile = useIsMobile();
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspTab, setInspTab] = useState(INSPECTOR_TABS[0]?.id ?? 'bigo');
  const selectInsp = (id: string) => {
    if (inspectorOpen && id === inspTab) {
      setInspectorOpen(false);
      return;
    }
    setInspTab(id);
    setInspectorOpen(true);
  };
  const { player } = useCanvasFrame();
  const { item, plugin } = useCanvasStatic();
  const { reference } = useCodeStudioContent();
  const isStatic = !!plugin.meta.static;
  const hasAnimation = player.total > 1;
  // Static plugins (e.g. design flow diagrams) have a single frame but still
  // have a board worth showing — treat them as viewable, just not steppable.
  const hasBoard = hasAnimation || isStatic;
  const hasSource = !!reference;
  const [rawView, setView] = useOverviewView(item.id);
  // Clamp the persisted animate/recall pref to what this problem actually offers,
  // so animation-less problems land on Recall instead of a dead, single-frame player.
  const view = hasBoard ? (hasSource ? rawView : 'animate') : hasSource ? 'recall' : 'animate';
  const canToggle = hasBoard && hasSource;
  const showViz = view === 'animate';

  const onRecallFirst = canToggle && view === 'animate';
  const footerLabel = onRecallFirst ? 'Recall' : nextLabel;
  const handleFooterNext = onRecallFirst ? () => setView('recall') : onNext;
  useStudioNextShortcut(handleFooterNext, onRecallFirst ? undefined : onNextAll);

  const footer = (
    <StudioNextFooter
      nextLabel={footerLabel}
      onNext={handleFooterNext}
      nextAllLabel={onRecallFirst ? undefined : nextAllLabel}
      onNextAll={onRecallFirst ? undefined : onNextAll}
    />
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (canToggle && e.altKey && e.key === '1') {
        e.preventDefault();
        setView('animate');
        return;
      }
      if (canToggle && e.altKey && e.key === '2') {
        e.preventDefault();
        setView('recall');
        return;
      }
      if (!showViz || !hasAnimation) return;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          player.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          player.prev();
          break;
        case ' ':
          e.preventDefault();
          player.togglePlay();
          break;
        case 'Home':
          e.preventDefault();
          player.goTo(0);
          break;
        case 'End':
          e.preventDefault();
          player.goTo(player.total - 1);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    canToggle,
    hasAnimation,
    player.next,
    player.prev,
    player.togglePlay,
    player.goTo,
    player.total,
    setView,
    showViz,
  ]);

  return (
    <StudioSplitLayout
      footer={footer}
      problem={
        <OverviewProblemColumn
          className={cn(isMobile && 'max-h-[min(40vh,50%)] min-h-0 border-b border-edge')}
          view={view}
          onView={setView}
          canToggle={canToggle}
          boardLabel={isStatic ? 'Design' : 'Animate'}
        >
          <ProblemPanelBody />
        </OverviewProblemColumn>
      }
      second={
        isMobile ? (
          <OverviewContentColumn showViz={showViz} />
        ) : (
          <div className="problem-overview-stage flex min-h-0 min-w-0 flex-1">
            <OverviewContentColumn showViz={showViz} />
            {inspectorOpen && (
              <StudioInspectorRail
                tabs={INSPECTOR_TABS}
                activeId={inspTab}
                onTab={setInspTab}
                onClose={() => setInspectorOpen(false)}
              />
            )}
            <StudioPanelDock
              tabs={INSPECTOR_TABS}
              inspectorOpen={inspectorOpen}
              activeId={inspTab}
              onSelect={selectInsp}
            />
          </div>
        )
      }
    />
  );
}
