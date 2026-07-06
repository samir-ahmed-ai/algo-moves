import { cn } from '@/lib/utils/cn';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import type { StudioTab } from '@/shell/study/studioTabs';
import { ProblemPanelBody } from './ProblemPanelBody';
import { ProblemStatementColumn } from './overviewColumns';
import { StudioArcRail } from './StudioArcRail';
import { StudioNextFooter } from './StudioNextFooter';
import { StudioContentPanel, StudioSplitLayout } from './studioSplitLayout';
import { useStudioNextShortcut } from './useStudioNextShortcut';
import { PanelBody } from '../PanelBodyRouter';

/** Generic Learn Studio tab body: problem statement beside a registered panel. */
export function StudioPanelStageBody({
  kind,
  availTabs,
  activeTabId,
  nextLabel,
  onNext,
}: {
  kind: string;
  availTabs: StudioTab[];
  activeTabId: string;
  nextLabel?: string;
  onNext?: () => void;
}) {
  const isMobile = useIsMobile();

  useStudioNextShortcut(onNext);

  return (
    <StudioSplitLayout
      footer={
        <StudioNextFooter
          arcRail={<StudioArcRail availTabs={availTabs} activeTabId={activeTabId} />}
          nextLabel={nextLabel}
          onNext={onNext}
        />
      }
      problem={
        <ProblemStatementColumn className={cn(isMobile && 'max-h-[40vh] shrink-0 border-b border-edge')}>
          <ProblemPanelBody />
        </ProblemStatementColumn>
      }
      second={
        <StudioContentPanel>
          <div className="ws-scroll min-h-0 flex-1 overflow-auto p-3 sm:p-4">
            <PanelBody kind={kind} />
          </div>
        </StudioContentPanel>
      }
    />
  );
}
