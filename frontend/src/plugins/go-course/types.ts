import type { QuizQuestion } from '../../core/types';

/** An open-ended senior design question paired with a model answer. */
export interface GoDesignQuestion {
  prompt: string;
  answer: string;
}

/** A key/value chip shown in the animation side rail. */
export interface GoStateChip {
  k: string;
  v: string;
}

/**
 * One step of a concept's narrative walkthrough. `focus` is an optional
 * authoring anchor (exact code substrings — retained in content but not
 * rendered in the UI); `state` is the evolving program/mental state shown
 * alongside.
 */
export interface GoTraceStep {
  title: string;
  caption: string;
  focus: string[];
  state: GoStateChip[];
}

/**
 * One concept card in the hand-authored "Go — Senior Developer" course. Each
 * concept becomes a ProblemPlugin (see ./factory.tsx) reusing the prep Scene
 * player, and carries an advanced multiple-choice quiz, a compilable Go sample
 * (also auto-split into a code-reassembly exercise), and a design Q&A.
 */
export interface GoConcept {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  /** One-line subtitle shown in the catalog. */
  summary: string;
  /** Short chip label, e.g. "Channels", "Escape analysis". */
  pattern: string;
  /** One line: how the mechanism actually works. */
  visual: string;
  /** Terse mnemonic a candidate can recall under interview pressure. */
  memorize: string;
  /** Vivid 1-2 sentence memory hook for the Scene player. */
  scene: string;
  /** Complexity of the code sample (or "—"). */
  time: string;
  space: string;
  /** Self-contained, gofmt-clean, compilable Go program (package main). */
  code: string;
  /** Advanced concept questions (multiple-choice, exactly one correct each). */
  quiz: QuizQuestion[];
  /** Open-ended design question + model answer. */
  design: GoDesignQuestion;
  /** Senior takeaways shown in the inspector. */
  keyPoints: string[];
  /** Ordered narrative walkthrough steps; omit to fall back to the Scene reveal. */
  walkthrough?: GoTraceStep[];
}

/** A course topic grouping several concepts (Concurrency, Generics, …). */
export interface GoTopic {
  id: string;
  title: string;
  /** lucide icon name (matches CourseDef.icon). */
  icon: string;
  concepts: GoConcept[];
}
