import type { Chunk } from '@codemirror/merge';
import { RangeSet, StateEffect, StateField, type Extension, type Text } from '@codemirror/state';
import { Decoration, EditorView, GutterMarker, gutterLineClass } from '@codemirror/view';

/** How the recall pointer maps a cursor line from one side to the other. */
export type PointerMode = 'line' | 'diff';

/** Sets (or clears, with `null`) the 1-based line to highlight as the "pointer". */
export const setPointerLine = StateEffect.define<number | null>();

class PointerGutterMarker extends GutterMarker {
  elementClass = 'cm-recall-pointer-gutter';
}
const pointerGutterMarker = new PointerGutterMarker();

const pointerLineDeco = Decoration.line({ class: 'cm-recall-pointer-line' });

/** Tracks the currently-pointed-at line (1-based), remapped through local edits. */
export const pointerLineField = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setPointerLine)) value = e.value;
    }
    if (value != null) {
      if (tr.docChanged) value = Math.min(value, tr.state.doc.lines);
      if (value < 1) value = null;
    }
    return value;
  },
});

const pointerDecorations = EditorView.decorations.compute([pointerLineField], (state) => {
  const lineNum = state.field(pointerLineField);
  if (lineNum == null || lineNum < 1 || lineNum > state.doc.lines) return Decoration.none;
  const line = state.doc.line(lineNum);
  return Decoration.set([pointerLineDeco.range(line.from)]);
});

const pointerGutterDecorations = gutterLineClass.compute([pointerLineField], (state) => {
  const lineNum = state.field(pointerLineField);
  if (lineNum == null || lineNum < 1 || lineNum > state.doc.lines) return RangeSet.empty;
  const line = state.doc.line(lineNum);
  return RangeSet.of([pointerGutterMarker.range(line.from)]);
});

const pointerTheme = EditorView.baseTheme({
  '.cm-recall-pointer-line': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 14%, transparent)',
    boxShadow: 'inset 3px 0 0 0 var(--accent)',
  },
  '.cm-recall-pointer-gutter': {
    color: 'var(--accent) !important',
    fontWeight: 700,
  },
});

/** Extensions needed on a side of the split to display the recall pointer. */
export function pointerExtension(): Extension[] {
  return [pointerLineField, pointerDecorations, pointerGutterDecorations, pointerTheme];
}

export function clearPointerLine(view: EditorView) {
  if (view.state.field(pointerLineField, false) === undefined) return;
  if (view.state.field(pointerLineField) == null) return;
  view.dispatch({ effects: setPointerLine.of(null) });
}

/** Highlights `line` (1-based, clamped) on `view` as the pointer, optionally scrolling it into view. */
export function showPointerLine(view: EditorView, line: number, opts?: { scroll?: boolean }) {
  if (view.state.field(pointerLineField, false) === undefined) return;
  const clamped = Math.max(1, Math.min(line, view.state.doc.lines));
  const pos = view.state.doc.line(clamped).from;
  const effects: StateEffect<unknown>[] = [setPointerLine.of(clamped)];
  if (opts?.scroll) effects.push(EditorView.scrollIntoView(pos, { y: 'center' }));
  view.dispatch({ effects });
}

function lineNumberAt(doc: Text, pos: number): number {
  const clamped = Math.max(0, Math.min(pos, doc.length));
  return doc.lineAt(clamped).number;
}

/**
 * Maps a 1-based line number from one merge-view side to the other.
 *
 * `'line'` mode simply clamps the same line number into the target doc.
 * `'diff'` mode walks the merge chunks so that lines in unchanged regions
 * track their true counterpart, and lines inside a changed chunk map onto
 * the corresponding (clamped) position within that chunk on the other side.
 */
export function mapPointerLine(
  fromLine: number,
  mode: PointerMode,
  chunks: readonly Chunk[],
  fromDoc: Text,
  toDoc: Text,
  direction: 'aToB' | 'bToA',
): number {
  const clampedInput = Math.max(1, Math.min(fromLine, fromDoc.lines));
  if (mode === 'line') return Math.max(1, Math.min(clampedInput, toDoc.lines));

  let fromCursor = 1;
  let toCursor = 1;

  for (const chunk of chunks) {
    const fromFrom = direction === 'aToB' ? chunk.fromA : chunk.fromB;
    const fromTo = direction === 'aToB' ? chunk.toA : chunk.toB;
    const toFrom = direction === 'aToB' ? chunk.fromB : chunk.fromA;
    const toTo = direction === 'aToB' ? chunk.toB : chunk.toA;

    const fromHasLines = fromTo > fromFrom;
    const toHasLines = toTo > toFrom;

    const chunkFromStart = lineNumberAt(fromDoc, fromFrom);
    const chunkFromEnd = fromHasLines ? lineNumberAt(fromDoc, Math.max(fromFrom, fromTo - 1)) : chunkFromStart - 1;
    const chunkToStart = lineNumberAt(toDoc, toFrom);
    const chunkToEnd = toHasLines ? lineNumberAt(toDoc, Math.max(toFrom, toTo - 1)) : chunkToStart - 1;

    if (clampedInput < chunkFromStart) {
      const offset = clampedInput - fromCursor;
      return Math.max(1, Math.min(toCursor + offset, toDoc.lines));
    }

    if (clampedInput <= chunkFromEnd) {
      if (!toHasLines) return Math.max(1, Math.min(chunkToStart, toDoc.lines));
      const relative = clampedInput - chunkFromStart;
      const toLen = chunkToEnd - chunkToStart + 1;
      return Math.max(1, Math.min(chunkToStart + Math.min(relative, toLen - 1), toDoc.lines));
    }

    fromCursor = chunkFromEnd + 1;
    toCursor = chunkToEnd + 1;
  }

  const offset = clampedInput - fromCursor;
  return Math.max(1, Math.min(toCursor + offset, toDoc.lines));
}
