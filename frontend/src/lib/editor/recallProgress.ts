import type { MergeView } from '@codemirror/merge';
import { RangeSetBuilder, StateEffect, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import { computeRecallProgress } from '@/lib/code';

/** How much of the un-recalled reference to show ahead of the current line. */
export type RecallRevealMode = 'full' | 'dim' | 'blur' | 'hidden';

export interface RecallProgressState {
  /** 1-based reference line numbers fully confirmed as correct. */
  completedLines: readonly number[];
  /** 1-based reference line currently being typed, or null once every line is complete. */
  currentLine: number | null;
  /** Trimmed-character count of the current line matched so far. */
  matchedPrefixLen: number;
  /** Reveal level applied to not-yet-typed reference lines. */
  reveal: RecallRevealMode;
}

const EMPTY_PROGRESS: RecallProgressState = {
  completedLines: [],
  currentLine: null,
  matchedPrefixLen: 0,
  reveal: 'full',
};

/** Replaces the recall progress snapshot driving the reference-side decorations. */
export const setRecallProgress = StateEffect.define<RecallProgressState>();

/** Flashes `line` (1-based) briefly on the attempt side when a line is just completed. */
export const flashRecallLine = StateEffect.define<number | null>();

export const recallProgressField = StateField.define<RecallProgressState>({
  create: () => EMPTY_PROGRESS,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setRecallProgress)) value = e.value;
    }
    return value;
  },
});

const flashLineField = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(flashRecallLine)) value = e.value;
    }
    if (tr.docChanged) value = null;
    return value;
  },
});

const doneLineDeco = Decoration.line({ class: 'cm-recall-done' });
const currentLineDeco = Decoration.line({ class: 'cm-recall-current' });
// Line decorations only — inline marks on the current line corrupt CM6's tile tree (codemirror/dev#1652).
const currentLinePartialDeco = Decoration.line({ class: 'cm-recall-current cm-recall-partial' });
const upcomingLineDecoByReveal: Record<RecallRevealMode, Decoration> = {
  full: Decoration.line({ class: 'cm-recall-upcoming' }),
  dim: Decoration.line({ class: 'cm-recall-upcoming cm-reveal-dim' }),
  blur: Decoration.line({ class: 'cm-recall-upcoming cm-reveal-blur' }),
  hidden: Decoration.line({ class: 'cm-recall-upcoming cm-reveal-hidden' }),
};
const flashDeco = Decoration.line({ class: 'cm-recall-just-done' });

const recallProgressDecorations = EditorView.decorations.compute([recallProgressField, 'doc'], (state) => {
  const { completedLines, currentLine, matchedPrefixLen, reveal } = state.field(recallProgressField);
  const total = state.doc.lines;
  if (total === 0) return Decoration.none;

  const completed = new Set(completedLines);
  const upcomingDeco = upcomingLineDecoByReveal[reveal];
  const builder = new RangeSetBuilder<Decoration>();

  for (let ln = 1; ln <= total; ln++) {
    const line = state.doc.line(ln);
    if (completed.has(ln)) {
      builder.add(line.from, line.from, doneLineDeco);
      continue;
    }
    if (ln === currentLine) {
      builder.add(line.from, line.from, matchedPrefixLen > 0 ? currentLinePartialDeco : currentLineDeco);
      continue;
    }
    builder.add(line.from, line.from, upcomingDeco);
  }

  return builder.finish();
});

const flashDecorations = EditorView.decorations.compute([flashLineField, 'doc'], (state) => {
  const ln = state.field(flashLineField);
  if (ln == null || ln < 1 || ln > state.doc.lines) return Decoration.none;
  const line = state.doc.line(ln);
  return Decoration.set([flashDeco.range(line.from)]);
});

/** Reference-side extensions: done / current / upcoming (+ reveal) line decorations. Visuals live in theme.css. */
export function recallProgressExtension(): Extension[] {
  return [recallProgressField, recallProgressDecorations];
}

/** Attempt-side extensions: brief "just completed" flash on the line you just finished typing. */
export function recallFlashExtension(): Extension[] {
  return [flashLineField, flashDecorations];
}

const REVEAL_ORDER: readonly RecallRevealMode[] = ['full', 'dim', 'blur', 'hidden'];

export function isRecallRevealMode(value: unknown): value is RecallRevealMode {
  return REVEAL_ORDER.includes(value as RecallRevealMode);
}

export function cycleRecallReveal(current: RecallRevealMode): RecallRevealMode {
  return REVEAL_ORDER[(REVEAL_ORDER.indexOf(current) + 1) % REVEAL_ORDER.length];
}

export function recallRevealLabel(mode: RecallRevealMode): string {
  switch (mode) {
    case 'full':
      return 'Full';
    case 'dim':
      return 'Dimmed';
    case 'blur':
      return 'Blurred';
    case 'hidden':
      return 'Hidden';
  }
}

/** Builds the state snapshot consumed by `applyRecallProgress`. */
export function toRecallProgressState(
  progress: Pick<RecallProgressState, 'completedLines' | 'currentLine' | 'matchedPrefixLen'>,
  reveal: RecallRevealMode,
): RecallProgressState {
  return { ...progress, reveal };
}

/**
 * Syncs reference-side recall decorations on a merge view; optionally flashes a line just
 * completed on the draft side. Returns the new completed-line count.
 */
export function syncRecallProgress(
  mergeView: MergeView,
  reference: string,
  draftText: string,
  reveal: RecallRevealMode,
  prevCompletedCount: number,
  opts?: { flash?: boolean },
): number {
  const progress = computeRecallProgress(reference, draftText);
  applyRecallProgress(mergeView.a, toRecallProgressState(progress, reveal));
  if (opts?.flash && progress.completedLines.length > prevCompletedCount) {
    const line = progress.completedLines[progress.completedLines.length - 1];
    if (line != null) flashRecallCompletedLine(mergeView.b, line);
  }
  return progress.completedLines.length;
}

/** Pushes a new progress snapshot to `view` (a no-op if the extension isn't installed). */
export function applyRecallProgress(view: EditorView, progress: RecallProgressState) {
  if (view.state.field(recallProgressField, false) === undefined) return;
  if (!view.dom.isConnected) return;
  view.dispatch({ effects: setRecallProgress.of(progress) });
}

const flashTimeouts = new WeakMap<EditorView, number>();

/** Briefly flashes `line` (1-based) on `view`, then clears itself. */
export function flashRecallCompletedLine(view: EditorView, line: number) {
  if (view.state.field(flashLineField, false) === undefined) return;
  if (!view.dom.isConnected) return;

  const pending = flashTimeouts.get(view);
  if (pending != null) window.clearTimeout(pending);

  view.dispatch({ effects: flashRecallLine.of(line) });
  const timeoutId = window.setTimeout(() => {
    flashTimeouts.delete(view);
    if (!view.dom.isConnected) return;
    if (view.state.field(flashLineField, false) === undefined) return;
    view.dispatch({ effects: flashRecallLine.of(null) });
  }, 650);
  flashTimeouts.set(view, timeoutId);
}
