import { cn } from '@/lib/utils/cn';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { AssembleModes } from '@/shell/study/components/AssembleModes';
import { ProblemPanelBody } from './ProblemPanelBody';
import { ProblemStatementColumn } from './overviewColumns';
import { StudioNextFooter } from './StudioNextFooter';
import { StudioContentPanel, StudioSplitLayout } from './studioSplitLayout';
import { useStudioNextShortcut } from './useStudioNextShortcut';

/** Assemble tab — problem statement beside the piece-assembly games/modes. */
export function StudioAssembleStageBody({
  nextLabel,
  onNext,
  nextAllLabel,
  onNextAll,
}: {
  nextLabel?: string | undefined;
  onNext?: (() => void) | undefined;
  nextAllLabel?: string | undefined;
  onNextAll?: (() => void) | undefined;
}) {
  const isMobile = useIsMobile();

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
          className={cn(isMobile && 'max-h-[min(40vh,50%)] min-h-0 border-b border-edge')}
        >
          <ProblemPanelBody />
        </ProblemStatementColumn>
      }
      second={
        <StudioContentPanel>
          <div className="studio-assemble-stage-body flex min-h-0 flex-1 flex-col">
            <AssembleModes />
          </div>
        </StudioContentPanel>
      }
    />
  );
}
