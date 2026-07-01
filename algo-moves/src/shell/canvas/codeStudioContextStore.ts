import { createContext } from 'react';
import type { QuizQuestion } from '../../core/types';
import type { CodePiece } from '../../lib/codePieces';
import type {
  CodeStudioPhase,
  QuizProgress,
  loadReassembleProgress,
} from '../../lib/codeStudioPhase';
import type { EditorPrefs } from '../../lib/editorPrefs';
import type { statFor } from '../../lib/progress';

export interface CodeVariant {
  text: string;
  lang?: string;
  file?: string;
}

export interface CodeStudioContextValue {
  variants: CodeVariant[];
  active: number;
  setActive: (i: number) => void;
  code: CodeVariant | undefined;
  reference: string;
  draft: string;
  persistDraft: (v: string) => void;
  skeleton: string;
  blind: boolean;
  setBlind: (v: boolean | ((b: boolean) => boolean)) => void;
  peek: boolean;
  setPeek: (v: boolean) => void;
  copied: boolean;
  copyRef: () => Promise<void>;
  editorPrefs: EditorPrefs;
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void;
  timerRunning: boolean;
  setTimerRunning: (v: boolean | ((r: boolean) => boolean)) => void;
  timerLabel: string;
  score: number;
  timeLabel: string | undefined;
  spaceLabel: string | undefined;
  stat: ReturnType<typeof statFor>;
  theme: 'dark' | 'light' | undefined;
  phase: CodeStudioPhase;
  phaseSeq: CodeStudioPhase[];
  /** Human label of the phase that follows the current one (e.g. "Structure"). */
  nextLabel: string;
  goToPhase: (p: CodeStudioPhase) => void;
  /** Move to the next phase in the sequence (Skip / Continue). */
  advance: () => void;
  quiz: QuizQuestion[] | null;
  hasQuiz: boolean;
  savedQuizProgress: QuizProgress | null;
  onQuizProgress: (p: QuizProgress) => void;
  onQuizContinue: (score: number) => void;
  pieces: CodePiece[] | null;
  hasReassemble: boolean;
  phaseTransition: boolean;
  resetReassemble: () => void;
  reassembleKey: number;
  onReassembleComplete: (placed: CodePiece[], mistakes: number) => void;
  savedReassembleProgress: ReturnType<typeof loadReassembleProgress>;
  /** When set, the studio stays on this phase (standalone Structure panel). */
  phaseLocked: boolean;
}

export const CodeStudioContext = createContext<CodeStudioContextValue | null>(null);
