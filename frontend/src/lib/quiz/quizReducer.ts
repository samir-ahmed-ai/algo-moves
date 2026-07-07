import type { QuizQuestion } from '../../core/types';

export type QuizState = {
  index: number;
  picked: number | null;
  score: number;
  done: boolean;
  shuffleSeed: number;
};

export type QuizAction =
  | { type: 'PICK'; index: number; correct: boolean }
  | { type: 'NEXT' }
  | { type: 'FINISH' }
  | { type: 'RESTART'; seed: number };

export function initialQuizState(): QuizState {
  return { index: 0, picked: null, score: 0, done: false, shuffleSeed: 0 };
}

export function quizReducer(state: QuizState, action: QuizAction, total: number): QuizState {
  switch (action.type) {
    case 'PICK':
      if (state.picked !== null || state.done) return state;
      return {
        ...state,
        picked: action.index,
        score: action.correct ? state.score + 1 : state.score,
      };
    case 'NEXT':
      if (state.index >= total - 1) return { ...state, done: true, picked: null };
      return { ...state, index: state.index + 1, picked: null };
    case 'FINISH':
      return { ...state, done: true, picked: null };
    case 'RESTART':
      return { index: 0, picked: null, score: 0, done: false, shuffleSeed: action.seed };
    default:
      return state;
  }
}

export function quizAccuracy(score: number, total: number): number {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

export function currentQuizQuestion(quiz: QuizQuestion[], state: QuizState): QuizQuestion | undefined {
  return quiz[state.index];
}
