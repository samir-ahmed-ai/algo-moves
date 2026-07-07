import { createContext, type MutableRefObject } from 'react';
import type { EditorView } from '@codemirror/view';
import type { QuizQuestion } from '@/core/types';
import type { CodePiece } from '@/lib/code';
import type { CodeStudioPhase, QuizProgress, loadReassembleProgress } from '@/store/user-prefs';
import type { EditorPrefs } from '@/store/user-prefs';
import type { statFor } from '@/store/persistence';

export interface CodeVariant {
  text: string;
  lang?: string;
  file?: string;
}

export interface CodeStudioContentContextValue {
  variants: CodeVariant[];
  active: number;
  setActive: (i: number) => void;
  code: CodeVariant | undefined;
  reference: string;
  timeLabel: string | undefined;
  spaceLabel: string | undefined;
  stat: ReturnType<typeof statFor>;
  theme: 'dark' | 'light' | undefined;
}

export interface CodeStudioPhaseContextValue {
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

export interface CodeStudioDraftContextValue {
  draft: string;
  persistDraft: (v: string) => void;
  blind: boolean;
  setBlind: (v: boolean | ((b: boolean) => boolean)) => void;
  peek: boolean;
  setPeek: (v: boolean) => void;
  timerRunning: boolean;
  setTimerRunning: (v: boolean | ((r: boolean) => boolean)) => void;
  timerLabel: string;
  score: number;
}

export interface CodeStudioEditorContextValue {
  editorPrefs: EditorPrefs;
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void;
  copied: boolean;
  copyRef: () => Promise<void>;
  draftViewRef: MutableRefObject<EditorView | null>;
  formatBothRef: MutableRefObject<(() => void) | null>;
  foldBothRef: MutableRefObject<{ collapse: () => void; expand: () => void } | null>;
}

export type CodeStudioContextValue = CodeStudioContentContextValue &
  CodeStudioPhaseContextValue &
  CodeStudioDraftContextValue &
  CodeStudioEditorContextValue;

export const CodeStudioContentContext = createContext<CodeStudioContentContextValue | null>(null);
export const CodeStudioPhaseContext = createContext<CodeStudioPhaseContextValue | null>(null);
export const CodeStudioDraftContext = createContext<CodeStudioDraftContextValue | null>(null);
export const CodeStudioEditorContext = createContext<CodeStudioEditorContextValue | null>(null);

/** @deprecated Use slice contexts; kept for backward compatibility during migration. */
export const CodeStudioContext = CodeStudioContentContext;
