import { cn } from '@/lib/utils/cn';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import type { StudioTab } from '@/shell/study/studioTabs';
import { AssembleModes } from '@/shell/study/components/AssembleModes';
import { ProblemPanelBody } from './ProblemPanelBody';
import { ProblemStatementColumn } from './overviewColumns';
import { StudioArcRail } from './StudioArcRail';
import { StudioNextFooter } from './StudioNextFooter';
import { StudioContentPanel, StudioSplitLayout } from './studioSplitLayout';
import { useStudioNextShortcut } from './useStudioNextShortcut';

/** Assemble tab — problem statement beside the piece-assembly games/modes. */
export function StudioAssembleStageBody({
  availTabs,
  activeTabId,
  nextLabel,
  onNext,
  nextAllLabel,
  onNextAll,
}: {
  availTabs: StudioTab[];
  activeTabId: string;
  nextLabel?: string;
  onNext?: () => void;
  nextAllLabel?: string;
  onNextAll?: () => void;
}) {
  const isMobile = useIsMobile();

  useStudioNextShortcut(onNext, onNextAll);

  return (
    <StudioSplitLayout
      footer={
        <StudioNextFooter
          arcRail={<StudioArcRail availTabs={availTabs} activeTabId={activeTabId} />}
          nextLabel={nextLabel}
          onNext={onNext}
          nextAllLabel={nextAllLabel}
          onNextAll={onNextAll}
        />
      }
      problem={
        <ProblemStatementColumn
          className={cn(isMobile && 'max-h-[40vh] shrink-0 border-b border-edge')}
        >
          <ProblemPanelBody />
        </ProblemStatementColumn>
      }
      second={
        <StudioContentPanel>
          <AssembleModes />
        </StudioContentPanel>
      }
    />
  );
}
