import { useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { ProblemPanelBody } from './ProblemPanelBody';
import { OverviewContentColumn, OverviewProblemColumn } from './overviewColumns';
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
  nextLabel?: string;
  onNext?: () => void;
  nextAllLabel?: string;
  onNextAll?: () => void;
} = {}) {
  const isMobile = useIsMobile();
  const { player } = useCanvasFrame();
  const { item } = useCanvasStatic();
  const { reference } = useCodeStudioContent();
  const hasRecall = !!reference;
  const [view, setView] = useOverviewView(item.id);
  const showViz = view === 'animate' || !hasRecall;

  const onRecallFirst = hasRecall && view === 'animate';
  const footerLabel = onRecallFirst ? 'Recall' : nextLabel;
  const handleFooterNext = onRecallFirst ? () => setView('recall') : onNext;
  const showArcRail = hasRecall || !!nextLabel;

  useStudioNextShortcut(handleFooterNext, onRecallFirst ? undefined : onNextAll);

  const footer = (
    <StudioNextFooter
      arcRail={
        showArcRail ? (
          <StudioArcRail view={view} hasRecall={hasRecall} nextLabel={nextLabel} />
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
      if (hasRecall && e.altKey && e.key === '1') {
        e.preventDefault();
        setView('animate');
        return;
      }
      if (hasRecall && e.altKey && e.key === '2') {
        e.preventDefault();
        setView('recall');
        return;
      }
      if (!showViz) return;
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
    hasRecall,
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
          hasRecall={hasRecall}
        >
          <ProblemPanelBody />
        </OverviewProblemColumn>
      }
      second={<OverviewContentColumn showViz={showViz} />}
    />
  );
}
