import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { ProblemPanelBody } from './ProblemPanelBody';
import { OverviewContentColumn, OverviewProblemColumn } from './overviewColumns';
import { INSPECTOR_TABS, StudioInspectorRail, StudioPanelDock } from './StudioInspectorRail';
import { StudioArcRail } from './StudioArcRail';
import { StudioNextFooter } from './StudioNextFooter';
import { StudioSplitLayout } from './studioSplitLayout';
import { useOverviewView } from './useOverviewView';
import { useStudioNextShortcut } from './useStudioNextShortcut';
import { useCodeStudioContent } from '@/shell/study/CodeStudio';
import { useCanvasFrame, useCanvasStatic } from '@/shell/canvas';

/** Learn Overview tab — problem statement beside the live animation board. */
export function ProblemOverviewBody({
  nextLabel,
  onNext,
  nextAllLabel,
  onNextAll,
}: {
  nextLabel?: string | undefined;
  onNext?: (() => void) | undefined;
  nextAllLabel?: string | undefined;
  onNextAll?: (() => void) | undefined;
} = {}) {
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
  const { item } = useCanvasStatic();
  const { reference } = useCodeStudioContent();
  const hasAnimation = player.total > 1;
  const hasSource = !!reference;
  const [rawView, setView] = useOverviewView(item.id);
  // Clamp the persisted animate/recall pref to what this problem actually offers,
  // so animation-less problems land on Recall instead of a dead, single-frame player.
  const view = hasAnimation ? (hasSource ? rawView : 'animate') : hasSource ? 'recall' : 'animate';
  const canToggle = hasAnimation && hasSource;
  const showViz = view === 'animate';

  const onRecallFirst = canToggle && view === 'animate';
  const footerLabel = onRecallFirst ? 'Recall' : nextLabel;
  const handleFooterNext = onRecallFirst ? () => setView('recall') : onNext;
  const overviewStepCount = (hasAnimation ? 1 : 0) + (hasSource ? 1 : 0) + (nextLabel ? 1 : 0);
  const showArcRail = overviewStepCount >= 2;

  useStudioNextShortcut(handleFooterNext, onRecallFirst ? undefined : onNextAll);

  const footer = (
    <StudioNextFooter
      arcRail={
        showArcRail ? (
          <StudioArcRail
            view={view}
            canAnimate={hasAnimation}
            canRecall={hasSource}
            nextLabel={nextLabel}
          />
        ) : undefined
      }
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
          className={cn(isMobile && 'max-h-[40vh] shrink-0 border-b border-edge')}
          view={view}
          onView={setView}
          canToggle={canToggle}
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
