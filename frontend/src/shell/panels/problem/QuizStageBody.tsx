import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { flatOrder, type StudioTab } from '@/shell/study/studioTabs';
import { studioTabAfter } from '@/shell/study/studioArcNav';
import { ProblemPanelBody } from '@/shell/panels/problem/ProblemPanelBody';
import { ProblemStatementColumn } from '@/shell/panels/problem/overviewColumns';
import { QuizAssembleGames } from '@/shell/panels/problem/QuizAssembleGames';
import { StudioArcRail } from '@/shell/panels/problem/StudioArcRail';
import { StudioNextFooter } from '@/shell/panels/problem/StudioNextFooter';
import { StudioContentPanel, StudioSplitLayout } from '@/shell/panels/problem/studioSplitLayout';
import { useStudioNextShortcut } from '@/shell/panels/problem/useStudioNextShortcut';
import { EmptyState, useCanvasActions, useCanvasStatic, useQuizHostRelay } from '@/shell/canvas';
import { useCodeStudioContent, useCodeStudioPhase } from '@/shell/study/CodeStudio';
import { CodeStudioQuiz } from '@/shell/study/CodeStudioQuiz';

type QuizStage = 'quiz' | 'reassemble';

/** Quiz tab — problem statement beside the quiz card, then inline reassemble games. */
export function QuizStageBody({
  availTabs,
  activeTabId,
  nextAllLabel,
  onNextAll,
}: {
  availTabs: StudioTab[];
  activeTabId: string;
  nextAllLabel?: string;
  onNextAll?: () => void;
}) {
  const isMobile = useIsMobile();
  const { active } = useCodeStudioContent();
  const { hasReassemble, savedQuizProgress, pieces, onReassembleComplete } = useCodeStudioPhase();
  const { item } = useCanvasStatic();
  const { advancePractice } = useCanvasActions();
  const [stage, setStage] = useState<QuizStage>(() =>
    savedQuizProgress?.done && hasReassemble ? 'reassemble' : 'quiz',
  );

  const order = useMemo(() => flatOrder(availTabs), [availTabs]);
  const nextAfterAssemble = useMemo(() => studioTabAfter(order, 'assemble'), [order]);

  useEffect(() => {
    setStage(savedQuizProgress?.done && hasReassemble ? 'reassemble' : 'quiz');
  }, [item.id, active, savedQuizProgress?.done, hasReassemble]);

  const markReassembleDone = useCallback(() => {
    if (pieces) onReassembleComplete(pieces, 0);
  }, [pieces, onReassembleComplete]);

  const finishReassemble = useCallback(() => {
    markReassembleDone();
    // Reassemble already ran inline on the quiz tab — skip the assemble tab.
    advancePractice('assemble');
  }, [markReassembleDone, advancePractice]);

  const handleNextAll = useCallback(() => {
    if (stage === 'reassemble') markReassembleDone();
    onNextAll?.();
  }, [stage, markReassembleDone, onNextAll]);

  useStudioNextShortcut(stage === 'reassemble' ? finishReassemble : undefined, handleNextAll);

  const arcTabId = stage === 'reassemble' ? 'assemble' : activeTabId;

  return (
    <StudioSplitLayout
      footer={
        <StudioNextFooter
          arcRail={<StudioArcRail availTabs={availTabs} activeTabId={arcTabId} />}
          nextLabel={stage === 'reassemble' ? nextAfterAssemble?.label : undefined}
          onNext={stage === 'reassemble' ? finishReassemble : undefined}
          nextAllLabel={nextAllLabel}
          onNextAll={handleNextAll}
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
          <QuizContent
            stage={stage}
            setStage={setStage}
            activeTabId={activeTabId}
            hasReassemble={hasReassemble}
            onAdvance={finishReassemble}
          />
        </StudioContentPanel>
      }
    />
  );
}

function QuizContent({
  stage,
  setStage,
  activeTabId,
  hasReassemble,
  onAdvance,
}: {
  stage: QuizStage;
  setStage: (s: QuizStage) => void;
  activeTabId: string;
  hasReassemble: boolean;
  onAdvance: () => void;
}) {
  const { active } = useCodeStudioContent();
  const { quiz, savedQuizProgress, nextLabel, onQuizProgress, onQuizContinue } =
    useCodeStudioPhase();
  const { item } = useCanvasStatic();
  const { onAnswer: relayQuizAnswer } = useQuizHostRelay(item.id);
  const { advancePractice } = useCanvasActions();
  const handoffLabel = hasReassemble ? 'Assemble' : nextLabel;

  const handleContinue = (_score: number) => {
    onQuizContinue(_score);
    if (hasReassemble) {
      setStage('reassemble');
      return;
    }
    advancePractice(activeTabId);
  };

  if (!quiz) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6">
        <EmptyState
          icon={<GraduationCap className="h-4 w-4" />}
          title="No quiz"
          hint="This problem has no quiz."
        />
      </div>
    );
  }

  if (stage === 'reassemble') {
    return <QuizAssembleGames onWinContinue={onAdvance} />;
  }

  return (
    <div className="ws-scroll min-h-0 flex-1 overflow-auto p-3 sm:p-4">
      <CodeStudioQuiz
        key={`quiz-${item.id}-${active}`}
        quiz={quiz}
        itemId={item.id}
        initial={savedQuizProgress}
        nextLabel={handoffLabel}
        onProgress={onQuizProgress}
        onContinue={handleContinue}
        onAnswer={relayQuizAnswer}
      />
    </div>
  );
}
