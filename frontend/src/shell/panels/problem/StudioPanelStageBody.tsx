import { cn } from '@/lib/utils/cn';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { ProblemPanelBody } from './ProblemPanelBody';
import { ProblemStatementColumn } from './overviewColumns';
import { StudioNextFooter } from './StudioNextFooter';
import { StudioContentPanel, StudioSplitLayout } from './studioSplitLayout';
import { useStudioNextShortcut } from './useStudioNextShortcut';
import { PanelBody } from '../PanelBodyRouter';

/** Generic Learn Studio tab body: problem statement beside a registered panel. */
export function StudioPanelStageBody({
  kind,
  nextLabel,
  onNext,
  nextAllLabel,
  onNextAll,
}: {
  kind: string;
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
          <div className="studio-panel-stage-body ws-scroll min-h-0 flex-1 overflow-auto p-3 sm:p-4">
            <PanelBody kind={kind} />
          </div>
        </StudioContentPanel>
      }
    />
  );
}
