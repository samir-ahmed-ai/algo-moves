import { useEffect, useRef } from 'react';
import { MergeView } from '@codemirror/merge';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { nodeText } from '@/design/typography';
import { useResizeSplit } from '@/hooks/useResizeSplit';
import {
  buildEditorTheme,
  buildRecallFontTheme,
  coreEditorExtensions,
  languageExtension,
  lineNumberExtensions,
  vimExtensions,
  wrapExtensions,
} from '@/lib/editor';
import { CODE_SPLIT_MAX, CODE_SPLIT_MIN } from '@/lib/editor/resizeSplit';
import { cn } from '@/lib/utils/cn';
import { mergeEditorChrome } from './CodeMirrorEditor';

export interface SplitCodeEditorProps {
  reference: string;
  draft: string;
  lang?: string;
  dark?: boolean;
  themeKey?: string;
  vim?: boolean;
  wrap?: boolean;
  /** Hide the reference pane (blind mode). */
  hideLeft?: boolean;
  /** Temporarily show reference while in blind mode (peek). */
  peekLeft?: boolean;
  splitPct?: number;
  onSplitPctChange?: (pct: number) => void;
  onDraftChange: (value: string) => void;
  /** Show change markers in the merge gutter. */
  mergeGutter?: boolean;
  /** Collapse long unchanged regions. */
  mergeCollapse?: boolean;
  /** Denser pane chrome (labels + editor padding). */
  compact?: boolean;
  fontSize?: number;
  lineHeight?: import('@/lib/editor/recallEditorTheme').RecallLineHeight;
  showLineNumbers?: boolean;
  highlightChanges?: boolean;
}

function sideWrap(view: EditorView): HTMLElement | null {
  return view.dom.parentElement;
}

/** Positions the MergeView's two internal columns to match `pctA`, or collapses A when hidden. */
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

/** Side-by-side CodeMirror merge diff — reference (read-only) vs editable draft. */
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
  mergeGutter = true,
  mergeCollapse = true,
  compact = false,
  fontSize = 12,
  lineHeight = 'normal',
  showLineNumbers = true,
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

  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;
  const mergeGutterRef = useRef(mergeGutter);
  mergeGutterRef.current = mergeGutter;
  const mergeCollapseRef = useRef(mergeCollapse);
  mergeCollapseRef.current = mergeCollapse;
  const highlightChangesRef = useRef(highlightChanges);
  highlightChangesRef.current = highlightChanges;
  const showLineNumbersRef = useRef(showLineNumbers);
  showLineNumbersRef.current = showLineNumbers;
  const fontSizeRef = useRef(fontSize);
  fontSizeRef.current = fontSize;
  const lineHeightRef = useRef(lineHeight);
  lineHeightRef.current = lineHeight;

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
          themeCompA.current.of(buildEditorTheme(isDark)),
          fontCompA.current.of(buildRecallFontTheme(fontSizeRef.current, lineHeightRef.current)),
          mergeEditorChrome,
        ],
      },
      b: {
        doc: draft,
        extensions: [
          vimComp.current.of(vimExtensions(vim ?? false)),
          ...coreEditorExtensions(langExt, { lineNumbers: false }),
          lineNumCompB.current.of(lineNumberExtensions(showLineNumbersRef.current)),
          wrapComp.current.of(wrapExtensions(wrap ?? false)),
          themeCompB.current.of(buildEditorTheme(isDark)),
          fontCompB.current.of(buildRecallFontTheme(fontSizeRef.current, lineHeightRef.current)),
          mergeEditorChrome,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onDraftChangeRef.current(u.state.doc.toString());
          }),
        ],
      },
    });

    mergeViewRef.current = view;
    applySplitLayout(view, splitPctRef.current, showLeftRef.current);

    return () => {
      mergeViewRef.current = null;
      view.destroy();
    };
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
    const editorDraft = view.state.doc.toString();
    if (draft === editorDraft) return;
    view.dispatch({ changes: { from: 0, to: editorDraft.length, insert: draft } });
  }, [draft]);

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

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius)] border border-edge',
        compact && 'cm-merge-compact-chrome',
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
        <div ref={hostRef} className={cn('cm-merge-diff-host nodrag h-full min-h-0', compact && 'cm-merge-compact')} />
        {showLeft && (
          <div
            {...handleProps}
            className="nodrag group absolute top-0 z-10 flex h-full w-2 -translate-x-1/2 cursor-col-resize items-stretch justify-center"
            style={{ left: `${splitPct}%` }}
          >
            <div className="split-handle h-full w-px bg-edge transition-colors hover:bg-accent" />
          </div>
        )}
      </div>
    </div>
  );
}
