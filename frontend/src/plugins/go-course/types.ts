import type { QuizQuestion } from '../../core/types';

/** An open-ended design question paired with a model answer (OpenRTB course). */
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
 * One concept card in a hand-authored concept course. The primary consumer is
 * the recall-first "Go Course" (see ./factory.tsx, ./topics), where each concept
 * is just the explanation, the memory hook, and a compilable Go snippet
 * auto-split into the Assemble/Recall exercise — no quiz or design problems.
 *
 * The same shape is reused by the OpenRTB course, which DOES ship a quiz and a
 * design Q&A per concept, so `quiz` and `design` are optional here and wired only
 * when present. Go Course concepts omit them (enforced by goCourse.test.ts).
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
  /** Key points to recall, shown in the inspector. */
  keyPoints: string[];
  /** Ordered narrative walkthrough steps; omit to fall back to the Scene reveal. */
  walkthrough?: GoTraceStep[];
  /**
   * Optional multiple-choice quiz. Omitted by the recall-first Go Course; the
   * OpenRTB course ships one per concept. When present, the Quiz tab is wired.
   */
  quiz?: QuizQuestion[];
  /** Optional design question + model answer (OpenRTB course only). */
  design?: GoDesignQuestion;
}

/** A course topic grouping several concepts (Concurrency, Generics, …). */
export interface GoTopic {
  id: string;
  title: string;
  /** lucide icon name (matches CourseDef.icon). */
  icon: string;
  concepts: GoConcept[];
}
