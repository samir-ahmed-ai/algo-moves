import { useCallback } from 'react';
import { useGameRoomOptional } from '@/shell/realtime';
import { useCanvasCollabOptional } from '../CanvasCollabProvider';
import { buildQuizAnswerOp } from '../protocol/quizProtocol';

export interface QuizAnswerPayload {
  problemId: string;
  questionId: string;
  answer: string;
  correct: boolean;
}

/**
 * Guest: relay quiz answers to the host only.
 * Host: read accumulated answers from {@link CanvasCollabApi.hostQuizLog}.
 */
export function useQuizHostRelay(problemId: string) {
  const collab = useCanvasCollabOptional();
  const room = useGameRoomOptional();
  const send = room?.send ?? (() => {});

  const isGuest = collab?.isCollaborating && collab.role === 'guest';

  const relayAnswer = useCallback(
    (payload: QuizAnswerPayload) => {
      if (!isGuest) return;
      send(buildQuizAnswerOp(payload.problemId, payload.questionId, payload.answer, payload.correct));
    },
    [isGuest, send],
  );

  const onAnswer = useCallback(
    (questionId: string, answer: string, correct: boolean) => {
      relayAnswer({ problemId, questionId, answer, correct });
    },
    [relayAnswer, problemId],
  );

  return {
    hostQuizLog: collab?.hostQuizLog ?? [],
    onAnswer: isGuest ? onAnswer : undefined,
  };
}
