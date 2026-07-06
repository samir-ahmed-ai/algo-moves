import { useEffect, useRef } from 'react';
import { getChunks, MergeView } from '@codemirror/merge';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { nodeText } from '@/design/typography';
import { useResizeSplit } from '@/hooks/useResizeSplit';
import { computeRecallProgress } from '@/lib/code';
import {
  applyRecallProgress,
  buildEditorTheme,
  buildRecallFontTheme,
  coreEditorExtensions,
  flashRecallCompletedLine,
  languageExtension,
  lineNumberExtensions,
  mapPointerLine,
  pointerExtension,
  recallFlashExtension,
  recallProgressExtension,
  showPointerLine,
  vimExtensions,
  wrapExtensions,
  type PointerMode,
  type RecallRevealMode,
} from '@/lib/editor';
import { CODE_SPLIT_MAX, CODE_SPLIT_MIN } from '@/lib/editor/resizeSplit';
import { cn } from '@/lib/utils/cn';
import { baseTheme } from './CodeMirrorEditor';

export interface SplitCodeEditorProps {
  reference: string;
  draft: string;
  lang?: string;
  dark?: boolean;
  themeKey?: string;
  vim?: boolean;
  wrap?: boolean;
  /** Hide the reference pane (blind recall mode). */
  hideLeft?: boolean;
  /** Temporarily show reference while in blind mode (peek). */
  peekLeft?: boolean;
  splitPct?: number;
  onSplitPctChange?: (pct: number) => void;
  onDraftChange: (value: string) => void;
  /** How the recall pointer maps a cursor line between reference and draft (default 'line'). */
  pointerMode?: PointerMode;
  /** How much of the not-yet-typed reference to show ahead of the current line. */
  reveal?: RecallRevealMode;
  /** Show change markers in the merge gutter. */
  mergeGutter?: boolean;
  /** Collapse long unchanged regions. */
  mergeCollapse?: boolean;
  /** Denser pane chrome (labels + editor padding). */
  compact?: boolean;
  fontSize?: number;
  lineHeight?: import('@/lib/editor/recallEditorTheme').RecallLineHeight;
  showLineNumbers?: boolean;
  showPointer?: boolean;
  highlightChanges?: boolean;
}

const sizeTheme = EditorView.theme({ '.cm-content': { minHeight: '100%' }, '.cm-editor': { height: '100%' } });

function sideWrap(view: EditorView): HTMLElement | null {
  return view.dom.parentElement;
}

/** Positions the MergeView's two internal columns to match `pctA`, or collapses A when hidden (blind mode). */
function applySplitLayout(mergeView: MergeView, pctA: number, showLeft: boolean) {
  const wrapA = sideWrap(mergeView.a);
  const wrapB = sideWrap(mergeView.b);
  if (!wrapA || !wrapB) return;
  if (!showLeft) {
    wrapA.style.display = 'none';
    wrapB.style.flex = '1 1 100%';
    wrapB.style.maxWidth = '100%';
  } else {
    wrapA.style.display = '';
    wrapA.style.flex = `0 0 ${pctA}%`;
    wrapA.style.maxWidth = `${pctA}%`;
    wrapB.style.flex = `0 0 ${100 - pctA}%`;
    wrapB.style.maxWidth = `${100 - pctA}%`;
  }
}

/**
 * World-class split editor for Recall — a single CodeMirror `@codemirror/merge` MergeView
 * (real diff alignment, collapsible unchanged regions, change gutters) with a bidirectional
 * cursor "pointer": moving the cursor in either pane highlights + scrolls the corresponding
 * line in the other, mapped either 1:1 by line number or diff-aligned via merge chunks.
 */
export function SplitCodeEditor({
  reference,
  draft,
  lang,
  dark,
  themeKey,
  vim,
  wrap,
  hideLeft,
  peekLeft,
  splitPct: splitPctProp = 50,
  onSplitPctChange,
  onDraftChange,
  pointerMode = 'line',
  reveal = 'full',
  mergeGutter = true,
  mergeCollapse = true,
  compact = false,
  fontSize = 12,
  lineHeight = 'normal',
  showLineNumbers = true,
  showPointer = true,
  highlightChanges = true,
}: SplitCodeEditorProps) {
  const showLeft = !hideLeft || Boolean(peekLeft);
  const hostRef = useRef<HTMLDivElement>(null);
  const mergeViewRef = useRef<MergeView | null>(null);
  const vimComp = useRef(new Compartment());
  const wrapComp = useRef(new Compartment());
  const themeCompA = useRef(new Compartment());
  const themeCompB = useRef(new Compartment());
  const fontCompA = useRef(new Compartment());
  const fontCompB = useRef(new Compartment());
  const lineNumCompA = useRef(new Compartment());
  const lineNumCompB = useRef(new Compartment());
  const pointerCompA = useRef(new Compartment());
  const pointerCompB = useRef(new Compartment());
  const syncingPointer = useRef(false);

  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;
  const pointerModeRef = useRef<PointerMode>(pointerMode);
  pointerModeRef.current = pointerMode;
  const mergeGutterRef = useRef(mergeGutter);
  mergeGutterRef.current = mergeGutter;
  const mergeCollapseRef = useRef(mergeCollapse);
  mergeCollapseRef.current = mergeCollapse;
  const highlightChangesRef = useRef(highlightChanges);
  highlightChangesRef.current = highlightChanges;
  const showLineNumbersRef = useRef(showLineNumbers);
  showLineNumbersRef.current = showLineNumbers;
  const showPointerRef = useRef(showPointer);
  showPointerRef.current = showPointer;
  const fontSizeRef = useRef(fontSize);
  fontSizeRef.current = fontSize;
  const lineHeightRef = useRef(lineHeight);
  lineHeightRef.current = lineHeight;
  const revealRef = useRef(reveal);
  revealRef.current = reveal;
  /** Count of completed lines as of the last dispatched progress snapshot — used to detect a just-finished line. */
  const progressCompletedCountRef = useRef(0);

  const { containerRef, splitPct, handleProps } = useResizeSplit({
    direction: 'horizontal',
    splitPct: splitPctProp,
    onSplitPctChange,
    minPct: CODE_SPLIT_MIN,
    maxPct: CODE_SPLIT_MAX,
    defaultPct: 50,
  });
  const splitPctRef = useRef(splitPct);
  splitPctRef.current = splitPct;
  const showLeftRef = useRef(showLeft);
  showLeftRef.current = showLeft;

  useEffect(() => {
    if (!hostRef.current) return;
    const isDark = dark ?? document.documentElement.classList.contains('dark');
    const langExt = languageExtension(lang);

    const mirrorPointer = (source: EditorView, target: EditorView, direction: 'aToB' | 'bToA') => {
      if (syncingPointer.current || !showPointerRef.current) return;
      const line = source.state.doc.lineAt(source.state.selection.main.head).number;
      const info = getChunks(source.state);
      const targetLine = mapPointerLine(
        line,
        pointerModeRef.current,
        info?.chunks ?? [],
        source.state.doc,
        target.state.doc,
        direction,
      );
      syncingPointer.current = true;
      showPointerLine(target, targetLine);
      syncingPointer.current = false;
    };

    const view = new MergeView({
      parent: hostRef.current,
      orientation: 'a-b',
      highlightChanges: highlightChangesRef.current,
      gutter: mergeGutterRef.current,
      collapseUnchanged: mergeCollapseRef.current ? { margin: 3, minSize: 4 } : undefined,
      a: {
        doc: reference,
        extensions: [
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          ...coreEditorExtensions(langExt, { lineNumbers: false }),
          lineNumCompA.current.of(lineNumberExtensions(showLineNumbersRef.current)),
          pointerCompA.current.of(showPointerRef.current ? pointerExtension() : []),
          recallProgressExtension(),
          themeCompA.current.of(buildEditorTheme(isDark)),
          fontCompA.current.of(buildRecallFontTheme(fontSizeRef.current, lineHeightRef.current)),
          sizeTheme,
          baseTheme,
          EditorView.updateListener.of((u) => {
            if (u.selectionSet && !u.docChanged) {
              const mv = mergeViewRef.current;
              if (mv) mirrorPointer(mv.a, mv.b, 'aToB');
            }
          }),
        ],
      },
      b: {
        doc: draft,
        extensions: [
          vimComp.current.of(vimExtensions(vim ?? false)),
          ...coreEditorExtensions(langExt, { lineNumbers: false }),
          lineNumCompB.current.of(lineNumberExtensions(showLineNumbersRef.current)),
          wrapComp.current.of(wrapExtensions(wrap ?? false)),
          pointerCompB.current.of(showPointerRef.current ? pointerExtension() : []),
          recallFlashExtension(),
          themeCompB.current.of(buildEditorTheme(isDark)),
          fontCompB.current.of(buildRecallFontTheme(fontSizeRef.current, lineHeightRef.current)),
          sizeTheme,
          baseTheme,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onDraftChangeRef.current(u.state.doc.toString());
            if (u.selectionSet) {
              const mv = mergeViewRef.current;
              if (mv) mirrorPointer(mv.b, mv.a, 'bToA');
            }
          }),
        ],
      },
    });

    mergeViewRef.current = view;
    applySplitLayout(view, splitPctRef.current, showLeftRef.current);

    const initialProgress = computeRecallProgress(reference, draft);
    applyRecallProgress(view.a, {
      completedLines: initialProgress.completedLines,
      currentLine: initialProgress.currentLine,
      matchedPrefixLen: initialProgress.matchedPrefixLen,
      reveal: revealRef.current,
    });
    progressCompletedCountRef.current = initialProgress.completedLines.length;

    return () => {
      mergeViewRef.current = null;
      view.destroy();
    };
    // Recreated only when the language changes; everything else reconfigures via compartments/effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    const view = mergeViewRef.current?.a;
    if (!view) return;
    if (reference !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: reference } });
    }
  }, [reference]);

  useEffect(() => {
    const view = mergeViewRef.current?.b;
    if (!view) return;
    if (draft !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: draft } });
    }
  }, [draft]);

  useEffect(() => {
    const view = mergeViewRef.current;
    if (!view) return;
    const progress = computeRecallProgress(reference, draft);
    applyRecallProgress(view.a, {
      completedLines: progress.completedLines,
      currentLine: progress.currentLine,
      matchedPrefixLen: progress.matchedPrefixLen,
      reveal,
    });
    if (progress.completedLines.length > progressCompletedCountRef.current) {
      const justCompleted = progress.completedLines[progress.completedLines.length - 1];
      flashRecallCompletedLine(view.b, justCompleted);
    }
    progressCompletedCountRef.current = progress.completedLines.length;
  }, [reference, draft, reveal]);

  useEffect(() => {
    const view = mergeViewRef.current;
    if (!view) return;
    const isDark = dark ?? document.documentElement.classList.contains('dark');
    const theme = buildEditorTheme(isDark);
    view.a.dispatch({ effects: themeCompA.current.reconfigure(theme) });
    view.b.dispatch({ effects: themeCompB.current.reconfigure(theme) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark, themeKey]);

  useEffect(() => {
    const view = mergeViewRef.current?.b;
    if (!view) return;
    view.dispatch({ effects: vimComp.current.reconfigure(vimExtensions(vim ?? false)) });
  }, [vim]);

  useEffect(() => {
    const view = mergeViewRef.current?.b;
    if (!view) return;
    view.dispatch({ effects: wrapComp.current.reconfigure(wrapExtensions(wrap ?? false)) });
  }, [wrap]);

  useEffect(() => {
    const view = mergeViewRef.current;
    if (!view) return;
    applySplitLayout(view, splitPct, showLeft);
    const t = setTimeout(() => view.reconfigure({}), 0);
    return () => clearTimeout(t);
  }, [splitPct, showLeft]);

  useEffect(() => {
    const view = mergeViewRef.current;
    if (!view) return;
    view.reconfigure({
      highlightChanges,
      gutter: mergeGutter,
      collapseUnchanged: mergeCollapse ? { margin: 3, minSize: 4 } : undefined,
    });
  }, [mergeGutter, mergeCollapse, highlightChanges]);

  useEffect(() => {
    const view = mergeViewRef.current;
    if (!view) return;
    const fontTheme = buildRecallFontTheme(fontSize, lineHeight);
    view.a.dispatch({ effects: fontCompA.current.reconfigure(fontTheme) });
    view.b.dispatch({ effects: fontCompB.current.reconfigure(fontTheme) });
  }, [fontSize, lineHeight]);

  useEffect(() => {
    const view = mergeViewRef.current;
    if (!view) return;
    const lineExt = lineNumberExtensions(showLineNumbers);
    view.a.dispatch({ effects: lineNumCompA.current.reconfigure(lineExt) });
    view.b.dispatch({ effects: lineNumCompB.current.reconfigure(lineExt) });
  }, [showLineNumbers]);

  useEffect(() => {
    const view = mergeViewRef.current;
    if (!view) return;
    const pointerExt = showPointer ? pointerExtension() : [];
    view.a.dispatch({ effects: pointerCompA.current.reconfigure(pointerExt) });
    view.b.dispatch({ effects: pointerCompB.current.reconfigure(pointerExt) });
  }, [showPointer]);

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-edge',
        compact && 'cm-recall-compact-chrome',
      )}
    >
      <div className={cn('flex shrink-0 border-b border-edge bg-panel2', compact ? 'h-6' : 'h-7')}>
        {showLeft && (
          <div
            style={{ flex: `0 0 ${splitPct}%`, maxWidth: `${splitPct}%` }}
            className={cn(
              'truncate border-r border-edge font-mono uppercase tracking-wide text-ink3',
              compact ? 'px-2 py-0.5' : 'px-2.5 py-1',
              nodeText['2xs'],
            )}
          >
            Reference
          </div>
        )}
        <div
          style={showLeft ? { flex: `0 0 ${100 - splitPct}%`, maxWidth: `${100 - splitPct}%` } : { flex: '1 1 100%' }}
          className={cn(
            'truncate font-mono uppercase tracking-wide text-ink3',
            compact ? 'px-2 py-0.5' : 'px-2.5 py-1',
            nodeText['2xs'],
          )}
        >
          Your attempt
        </div>
      </div>
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={hostRef}
          className={cn('cm-recall-merge-host nodrag h-full min-h-0', compact && 'cm-recall-compact')}
        />
        {showLeft && (
          <div
            {...handleProps}
            className="nodrag absolute top-0 z-10 flex h-full w-2 -translate-x-1/2 cursor-col-resize items-stretch justify-center"
            style={{ left: `${splitPct}%` }}
          >
            <div className="split-handle h-full w-px bg-edge transition-colors hover:bg-accent" />
          </div>
        )}
      </div>
    </div>
  );
}
