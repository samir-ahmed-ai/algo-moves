import { useEffect, useRef, type MutableRefObject } from 'react';
import { MergeView } from '@codemirror/merge';
import { Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { RecallLineHeight } from '@/lib/editor/recallEditorTheme';
import { nodeText } from '@/design/typography';
import { useResizeSplit, type UseResizeSplitOptions } from '@/hooks/useResizeSplit';
import {
  buildEditorTheme,
  buildRecallFontTheme,
  collapseMergeSections,
  coreEditorExtensions,
  expandMergeSections,
  formatMergeViews,
  languageExtension,
  lineNumberExtensions,
  mergeFormatKeymap,
  mergeReferenceReadOnly,
  vimExtensions,
  wrapExtensions,
  createRecallMergeRefreshScheduler,
  remeasureMergeViews,
  refreshRecallMergeView,
  syncDraftToEditorView,
} from '@/lib/editor';
import { CODE_SPLIT_MAX, CODE_SPLIT_MIN } from '@/lib/editor/resizeSplit';
import { buildRecallMergeReconfigure } from '@/lib/code/recallMergeDiff';
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
  lineHeight?: RecallLineHeight;
  showLineNumbers?: boolean;
  highlightChanges?: boolean;
  /** Receives the editable draft editor view for toolbar format/align actions. */
  draftViewRef?: MutableRefObject<EditorView | null>;
  /** Formats both reference + draft panes with matching spacing. */
  formatBothRef?: MutableRefObject<(() => void) | null>;
  /** Collapse / expand top-level sections in both panes. */
  foldBothRef?: MutableRefObject<{
    collapse: () => void;
    expand: () => void;
  } | null>;
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
  draftViewRef,
  formatBothRef,
  foldBothRef,
}: SplitCodeEditorProps) {
  const showLeft = !hideLeft || Boolean(peekLeft);
  const hostRef = useRef<HTMLDivElement>(null);
  const mergeViewRef = useRef<MergeView | null>(null);
  const readOnlyCompA = useRef(new Compartment());
  const formatBothFnRef = useRef<(() => void) | null>(null);
  const skipDraftSyncRef = useRef(false);
  const isLocalEditRef = useRef(false);
  const prevDraftLenRef = useRef(draft.length);
  const mergeSchedulerRef = useRef<ReturnType<typeof createRecallMergeRefreshScheduler> | null>(
    null,
  );
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
  const langRef = useRef(lang);
  langRef.current = lang;

  const mergeOptionsRef = useRef({
    highlightChanges,
    mergeGutter,
    mergeCollapse,
  });
  mergeOptionsRef.current = { highlightChanges, mergeGutter, mergeCollapse };

  const afterMergeRefreshRef = useRef<(view: MergeView) => void>(() => {});
  afterMergeRefreshRef.current = (view: MergeView) => {
    const bLen = view.b.state.doc.length;
    const prevLen = prevDraftLenRef.current;
    const lenChanged = prevLen !== bLen;
    prevDraftLenRef.current = bLen;

    if (mergeCollapseRef.current && prevLen - bLen > 80) {
      queueMicrotask(() => mergeSchedulerRef.current?.flush());
      return;
    }

    // Re-sync spacers when line count shifts — stale spacers look like extra-tall blank lines.
    if (lenChanged) {
      requestAnimationFrame(() => {
        remeasureMergeViews(view);
        refreshRecallMergeView(view, mergeOptionsRef.current);
      });
    }
  };

  const resizeSplitOptions: UseResizeSplitOptions = {
    direction: 'horizontal',
    splitPct: splitPctProp,
    minPct: CODE_SPLIT_MIN,
    maxPct: CODE_SPLIT_MAX,
    defaultPct: 50,
    ...(onSplitPctChange !== undefined ? { onSplitPctChange } : {}),
  };
  const { containerRef, splitPct, handleProps } = useResizeSplit(resizeSplitOptions);
  const splitPctRef = useRef(splitPct);
  splitPctRef.current = splitPct;
  const showLeftRef = useRef(showLeft);
  showLeftRef.current = showLeft;

  useEffect(() => {
    if (!hostRef.current) return;
    const isDark = dark ?? document.documentElement.classList.contains('dark');
    const langExt = languageExtension(lang);
    const coreOptions = lang ? { lineNumbers: false, lang } : { lineNumbers: false };

    mergeSchedulerRef.current = createRecallMergeRefreshScheduler(
      () => mergeViewRef.current,
      () => mergeOptionsRef.current,
      (view) => afterMergeRefreshRef.current(view),
    );

    const view = new MergeView({
      parent: hostRef.current,
      orientation: 'a-b',
      ...buildRecallMergeReconfigure({
        highlightChanges: highlightChangesRef.current,
        mergeGutter: mergeGutterRef.current,
        mergeCollapse: mergeCollapseRef.current,
      }),
      a: {
        doc: reference,
        extensions: [
          readOnlyCompA.current.of(mergeReferenceReadOnly),
          ...coreEditorExtensions(langExt, coreOptions),
          lineNumCompA.current.of(lineNumberExtensions(showLineNumbersRef.current)),
          mergeEditorChrome,
          themeCompA.current.of(buildEditorTheme(isDark)),
          fontCompA.current.of(buildRecallFontTheme(fontSizeRef.current, lineHeightRef.current)),
        ],
      },
      b: {
        doc: draft,
        extensions: [
          vimComp.current.of(vimExtensions(vim ?? false)),
          ...coreEditorExtensions(langExt, coreOptions),
          lineNumCompB.current.of(lineNumberExtensions(showLineNumbersRef.current)),
          wrapComp.current.of(wrapExtensions(wrap ?? false)),
          mergeEditorChrome,
          themeCompB.current.of(buildEditorTheme(isDark)),
          fontCompB.current.of(buildRecallFontTheme(fontSizeRef.current, lineHeightRef.current)),
          mergeFormatKeymap(() => formatBothFnRef.current?.()),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              isLocalEditRef.current = true;
              onDraftChangeRef.current(u.state.doc.toString());
              if (!skipDraftSyncRef.current) {
                mergeSchedulerRef.current?.schedule();
              }
            }
          }),
        ],
      },
    });

    mergeViewRef.current = view;
    if (draftViewRef) draftViewRef.current = view.b;
    formatBothFnRef.current = () => {
      skipDraftSyncRef.current = true;
      try {
        formatMergeViews(view, {
          readOnlyCompA: readOnlyCompA.current,
          onDraftChange: onDraftChangeRef.current,
          ...(langRef.current ? { lang: langRef.current } : {}),
        });
      } finally {
        queueMicrotask(() => {
          skipDraftSyncRef.current = false;
          mergeSchedulerRef.current?.flush();
        });
      }
    };
    if (formatBothRef) formatBothRef.current = formatBothFnRef.current;
    const foldBoth = {
      collapse: () => collapseMergeSections(view, langRef.current),
      expand: () => expandMergeSections(view),
    };
    if (foldBothRef) foldBothRef.current = foldBoth;
    applySplitLayout(view, splitPctRef.current, showLeftRef.current);

    return () => {
      mergeSchedulerRef.current?.dispose();
      mergeSchedulerRef.current = null;
      mergeViewRef.current = null;
      formatBothFnRef.current = null;
      if (draftViewRef) draftViewRef.current = null;
      if (formatBothRef) formatBothRef.current = null;
      if (foldBothRef) foldBothRef.current = null;
      view.destroy();
    };
  }, [lang]);

  useEffect(() => {
    const view = mergeViewRef.current?.a;
    if (!view) return;
    if (reference !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: reference } });
      mergeSchedulerRef.current?.flush();
    }
  }, [reference]);

  useEffect(() => {
    const view = mergeViewRef.current?.b;
    if (!view || skipDraftSyncRef.current) return;
    if (isLocalEditRef.current) {
      isLocalEditRef.current = false;
      return;
    }
    if (syncDraftToEditorView(view, draft)) {
      mergeSchedulerRef.current?.flush();
    }
  }, [draft]);

  useEffect(() => {
    const view = mergeViewRef.current;
    if (!view) return;
    const isDark = dark ?? document.documentElement.classList.contains('dark');
    const theme = buildEditorTheme(isDark);
    view.a.dispatch({ effects: themeCompA.current.reconfigure(theme) });
    view.b.dispatch({ effects: themeCompB.current.reconfigure(theme) });
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
    const t = window.setTimeout(() => mergeSchedulerRef.current?.flush(), 0);
    return () => window.clearTimeout(t);
  }, [splitPct, showLeft]);

  useEffect(() => {
    mergeSchedulerRef.current?.flush();
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
        'recall-split-editor flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-edge',
        compact && 'cm-merge-compact-chrome',
      )}
    >
      <div
        className={cn(
          'recall-split-header flex shrink-0 border-b border-edge bg-panel2',
          compact ? 'h-6' : 'h-7',
        )}
      >
        {showLeft && (
          <div
            style={{ flex: `0 0 ${splitPct}%`, maxWidth: `${splitPct}%` }}
            className={cn(
              'recall-pane-label truncate border-r border-edge font-mono uppercase tracking-wide text-ink3',
              compact ? 'px-2 py-0.5' : 'px-2.5 py-1',
              nodeText['2xs'],
            )}
          >
            Reference
          </div>
        )}
        <div
          style={
            showLeft
              ? { flex: `0 0 ${100 - splitPct}%`, maxWidth: `${100 - splitPct}%` }
              : { flex: '1 1 100%' }
          }
          className={cn(
            'recall-pane-label recall-pane-label--attempt truncate font-mono uppercase tracking-wide text-ink3',
            compact ? 'px-2 py-0.5' : 'px-2.5 py-1',
            nodeText['2xs'],
          )}
        >
          Your attempt
        </div>
      </div>
      <div
        ref={containerRef}
        className="recall-split-editor__body relative min-h-0 flex-1 overflow-hidden"
      >
        <div
          ref={hostRef}
          className={cn('cm-merge-diff-host nodrag h-full min-h-0', compact && 'cm-merge-compact')}
        />
        {showLeft && (
          <div
            {...handleProps}
            className="recall-split-editor__handle nodrag group absolute top-0 z-10 flex h-full w-2 -translate-x-1/2 cursor-col-resize items-stretch justify-center"
            style={{ left: `${splitPct}%` }}
          >
            <div className="split-handle h-full w-px bg-edge transition-colors hover:bg-accent" />
          </div>
        )}
      </div>
    </div>
  );
}
