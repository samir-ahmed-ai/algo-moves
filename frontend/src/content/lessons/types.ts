/**
 * Lessons are the first-class `kind:'reading'` content type. They are authored as a
 * JSON-serializable discriminated block union — NOT MDX — so they round-trip cleanly
 * into the read-only Postgres seed (the repo's "TS is source of truth, SQL is a
 * derived artifact" contract) and can be shape-validated by the catalog integrity
 * check. A lesson renders on its own surface, never through the problem=plugin path.
 */

/** Inline prose supports a safe subset only: **bold**, _em_, `code`, [label](url). */
export type LessonBlock =
  | { kind: 'heading'; level: 2 | 3; text: string }
  | { kind: 'prose'; text: string }
  | { kind: 'callout'; tone: 'note' | 'remember' | 'warn'; title?: string; text: string }
  | { kind: 'code'; lang: string; code: string; caption?: string }
  | { kind: 'list'; ordered?: boolean; items: string[] }
  | { kind: 'steps'; steps: Array<{ title?: string; caption: string }> }
  | { kind: 'keyPoints'; points: string[] }
  | { kind: 'problemRef'; itemId: string; note?: string };

export interface LessonDef {
  /** Matches the `kind:'reading'` catalog item id (or its explicit `lessonId`). */
  id: string;
  title: string;
  summary?: string;
  estimatedMinutes?: number;
  tags?: string[];
  blocks: LessonBlock[];
}
