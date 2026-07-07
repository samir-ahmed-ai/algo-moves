import { codeFolding, foldEffect, foldService, foldState, unfoldAll } from '@codemirror/language';
import type { MergeView } from '@codemirror/merge';
import type { EditorState, Extension } from '@codemirror/state';
import type { Command, EditorView } from '@codemirror/view';
import { styleLangFromId } from './styleFormat';

export type SectionFoldRange = { from: number; to: number };

const GO_HEADER = /^(func|type)\s/;
const JS_HEADER = /^(export\s+)?(async\s+)?function\s|^class\s/;
const PY_HEADER = /^def\s|^class\s/;
const JAVA_HEADER = /^(public|private|protected)?\s*(static\s+)?[\w<>,\[\]\s]+\s+\w+\s*\(/;

function leadingIndent(line: string): string {
  return line.slice(0, line.length - line.trimStart().length);
}

function normalizeLineNo(lineNo: number, max: number): number | null {
  if (!Number.isFinite(lineNo)) return null;
  const normalized = Math.trunc(lineNo);
  return normalized >= 1 && normalized <= max ? normalized : null;
}

function isTopLevelLine(line: string): boolean {
  const t = line.trim();
  return t.length > 0 && leadingIndent(line) === '';
}

function isSectionHeader(line: string, lang?: string): boolean {
  if (!isTopLevelLine(line)) return false;
  const t = line.trim();
  const style = styleLangFromId(lang);
  switch (style) {
    case 'go':
      return GO_HEADER.test(t);
    case 'js':
      return JS_HEADER.test(t);
    case 'python':
      return PY_HEADER.test(t);
    case 'java':
      return JAVA_HEADER.test(t) || /^class\s/.test(t);
    default:
      return /^(func|function|def|class)\s/.test(t);
  }
}

/** Find `{` … `}` body range to fold for a section starting at `lineNo`. */
export function sectionFoldRange(
  state: EditorState,
  lineNo: number,
  lang?: string,
): SectionFoldRange | null {
  const startLineNo = normalizeLineNo(lineNo, state.doc.lines);
  if (startLineNo == null) return null;
  const style = styleLangFromId(lang);

  if (style === 'python') {
    return pythonSectionFoldRange(state, startLineNo);
  }

  let openLine = startLineNo;
  let openPos = -1;
  while (openLine <= state.doc.lines) {
    const line = state.doc.line(openLine);
    openPos = line.text.indexOf('{');
    if (openPos !== -1) break;
    if (openLine > startLineNo) return null;
    openLine++;
  }

  const openLineObj = state.doc.line(openLine);
  const openFrom = openLineObj.from + openPos;
  let depth = 0;
  let closeFrom = -1;

  for (let pos = openFrom; pos < state.doc.length; pos++) {
    const ch = state.doc.sliceString(pos, pos + 1);
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        closeFrom = pos;
        break;
      }
    }
  }

  if (closeFrom === -1) return null;
  const from = openFrom + 1;
  const to = closeFrom;
  if (to <= from) return null;
  return { from, to };
}

function pythonSectionFoldRange(state: EditorState, defLineNo: number): SectionFoldRange | null {
  const safeDefLineNo = normalizeLineNo(defLineNo, state.doc.lines);
  if (safeDefLineNo == null) return null;
  if (safeDefLineNo >= state.doc.lines) return null;

  const bodyLineNo = safeDefLineNo + 1;
  if (bodyLineNo > state.doc.lines) return null;
  const bodyLine = state.doc.line(bodyLineNo);
  const bodyIndent = leadingIndent(bodyLine.text);
  if (!bodyLine.text.trim() || bodyIndent === '') return null;

  let endLine = bodyLineNo;
  while (endLine < state.doc.lines) {
    const next = state.doc.line(endLine + 1);
    const t = next.text.trim();
    if (!t) {
      endLine++;
      continue;
    }
    const ind = leadingIndent(next.text);
    if (ind.length < bodyIndent.length) break;
    endLine++;
  }

  return { from: bodyLine.from, to: state.doc.line(endLine).to };
}

/** All foldable top-level section bodies in the document. */
export function allSectionFoldRanges(state: EditorState, lang?: string): SectionFoldRange[] {
  const ranges: SectionFoldRange[] = [];
  for (let n = 1; n <= state.doc.lines; n++) {
    const line = state.doc.line(n);
    if (!isSectionHeader(line.text, lang)) continue;
    const range = sectionFoldRange(state, n, lang);
    if (range) ranges.push(range);
  }
  return ranges;
}

function sectionPlaceholder(state: EditorState, from: number, _to: number): string {
  const line = state.doc.lineAt(from);
  const m = line.text.match(/\b(?:func|function|def|type|class)\s+(\w+)/);
  return m ? ` ${m[1]}… ` : ' … ';
}

/** Extensions: gutter folds + custom section fold service for StreamLanguage modes. */
export function sectionFoldExtensions(lang?: string): Extension[] {
  return [
    codeFolding({
      preparePlaceholder: (state, { from }) => sectionPlaceholder(state, from, 0),
    }),
    foldService.of((state, lineStart, _lineEnd) => {
      const line = state.doc.lineAt(lineStart);
      if (!isSectionHeader(line.text, lang)) return null;
      return sectionFoldRange(state, line.number, lang);
    }),
  ];
}

function dispatchSectionFolds(view: EditorView, lang?: string): boolean {
  const ranges = allSectionFoldRanges(view.state, lang);
  if (!ranges.length) return false;
  const folded = view.state.field(foldState, false);
  const effects = ranges
    .filter((range) => {
      let overlap = false;
      folded?.between(range.from, range.to, () => {
        overlap = true;
      });
      return !overlap;
    })
    .map((range) => foldEffect.of(range));
  if (!effects.length) return false;
  view.dispatch({ effects });
  return true;
}

/** Collapse all top-level func/type/class sections. */
export function collapseSections(view: EditorView, lang?: string): boolean {
  return dispatchSectionFolds(view, lang);
}

/** Expand every folded region. */
export function expandSections(view: EditorView): boolean {
  return unfoldAll(view);
}

export const collapseSectionsCommand =
  (lang?: string): Command =>
  (view) =>
    collapseSections(view, lang);

export const expandSectionsCommand = (): Command => (view) => expandSections(view);

export const sectionFoldBindings = (lang?: string) => [
  { key: 'Mod-Alt-[', run: collapseSectionsCommand(lang) },
  { key: 'Mod-Alt-]', run: expandSectionsCommand() },
];

/** Collapse sections in both merge panes. */
export function collapseMergeSections(mergeView: MergeView, lang?: string): void {
  collapseSections(mergeView.a, lang);
  collapseSections(mergeView.b, lang);
}

/** Expand all folds in both merge panes. */
export function expandMergeSections(mergeView: MergeView): void {
  expandSections(mergeView.a);
  expandSections(mergeView.b);
}
