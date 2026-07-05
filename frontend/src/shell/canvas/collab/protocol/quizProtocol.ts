/**
 * Host-only quiz relay for interview sessions. Guests emit answers over the
 * room relay; only the host accumulates them (not peer broadcast).
 */
export const QUIZ_TAG = '__quiz' as const;

export interface QuizAnswerOp {
  [QUIZ_TAG]: 'answer';
  problemId: string;
  questionId: string;
  answer: string;
  correct: boolean;
  at: number;
}

export interface HostQuizEntry {
  peerId: string;
  peerName: string;
  problemId: string;
  questionId: string;
  answer: string;
  correct: boolean;
  at: number;
}

export function isQuizOp(value: unknown): value is QuizAnswerOp {
  const op = value as Partial<QuizAnswerOp> | null;
  return !!op && op[QUIZ_TAG] === 'answer' && typeof op.problemId === 'string';
}

export function buildQuizAnswerOp(
  problemId: string,
  questionId: string,
  answer: string,
  correct: boolean,
): QuizAnswerOp {
  return {
    [QUIZ_TAG]: 'answer',
    problemId,
    questionId,
    answer,
    correct,
    at: Date.now(),
  };
}

export function toHostQuizEntry(op: QuizAnswerOp, peerId: string, peerName: string): HostQuizEntry {
  return {
    peerId,
    peerName,
    problemId: op.problemId,
    questionId: op.questionId,
    answer: op.answer,
    correct: op.correct,
    at: op.at,
  };
}
