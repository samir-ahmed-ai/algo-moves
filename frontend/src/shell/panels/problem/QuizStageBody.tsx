import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import type { StudioTab } from '@/shell/study/studioTabs';
import { ProblemPanelBody } from '@/shell/panels/problem/ProblemPanelBody';
import { ProblemStatementColumn } from '@/shell/panels/problem/overviewColumns';
import { StudioArcRail } from '@/shell/panels/problem/StudioArcRail';
import { StudioContentPanel, StudioSplitLayout } from '@/shell/panels/problem/studioSplitLayout';
import { EmptyState, useCanvasActions, useCanvasStatic, useQuizHostRelay } from '@/shell/canvas';
import { useCodeStudioContent, useCodeStudioPhase } from '@/shell/study/CodeStudio';
import { CodeStudioQuiz } from '@/shell/study/CodeStudioQuiz';

/** Quiz tab — problem statement beside the quiz card. */
export function QuizStageBody({
  availTabs,
  activeTabId,
}: {
  availTabs: StudioTab[];
  activeTabId: string;
}) {
  const isMobile = useIsMobile();

  return (
    <StudioSplitLayout
      footer={
        <StudioArcRail availTabs={availTabs} activeTabId={activeTabId} />
      }
      problem={
        <ProblemStatementColumn className={cn(isMobile && 'max-h-[40vh] shrink-0 border-b border-edge')}>
          <ProblemPanelBody />
        </ProblemStatementColumn>
      }
      second={
        <StudioContentPanel>
          <QuizContent activeTabId={activeTabId} />
        </StudioContentPanel>
      }
    />
  );
}

function QuizContent({ activeTabId }: { activeTabId: string }) {
  const { active } = useCodeStudioContent();
  const { quiz, savedQuizProgress, nextLabel, onQuizProgress, onQuizContinue } = useCodeStudioPhase();
  const { item } = useCanvasStatic();
  const { onAnswer: relayQuizAnswer } = useQuizHostRelay(item.id);
  const { advancePractice } = useCanvasActions();

  const handleContinue = (score: number) => {
    onQuizContinue(score);
    // Mirror Mobile Mode, where finishing the quiz drops straight into the next
    // card (reassemble) — here, that means jumping to the next Learn Studio tab
    // instead of leaving the learner stranded on the quiz results screen.
    advancePractice(activeTabId);
  };

  if (!quiz) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6">
        <EmptyState icon={<GraduationCap className="h-4 w-4" />} title="No quiz" hint="This problem has no quiz." />
      </div>
    );
  }

  return (
    <div className="ws-scroll min-h-0 flex-1 overflow-auto p-3 sm:p-4">
      <CodeStudioQuiz
        key={`quiz-${item.id}-${active}`}
        quiz={quiz}
        itemId={item.id}
        initial={savedQuizProgress}
        nextLabel={nextLabel}
        onProgress={onQuizProgress}
        onContinue={handleContinue}
        onAnswer={relayQuizAnswer}
      />
    </div>
  );
}
