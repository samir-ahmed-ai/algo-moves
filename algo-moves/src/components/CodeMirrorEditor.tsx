import { useEffect, useRef } from 'react';
import { Compartment, EditorState, RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import { coreEditorExtensions, vimExtensions, wrapExtensions } from '../lib/editorSetup';
import { buildEditorTheme } from '../lib/editorTheme';
import { languageExtension } from '../lib/languageExtension';

export interface CodeMirrorEditorProps {
  value: string;
  /** Source language id (from `plugin.code.lang`). Add cases below to support more. */
  lang?: string;
  readOnly?: boolean;
  minHeight?: string;
  dark?: boolean;
  /** Changes when app theme preset changes — triggers editor chrome refresh. */
  themeKey?: string;
  vim?: boolean;
  wrap?: boolean;
  /** Fires with the full document text on every edit (for runnable scratch panels). */
  onChange?: (value: string) => void;
  /** 1-based line number → CSS class for diff highlighting. */
  lineDecorations?: Map<number, string>;
  /** Called when the editor view mounts/unmounts (sync-scroll wiring). */
  onView?: (view: EditorView | null) => void;
  className?: string;
}

function buildLineDecorations(state: EditorState, lines: Map<number, string>) {
  const builder = new RangeSetBuilder<Decoration>();
  for (const [lineNum, cls] of lines) {
    if (lineNum < 1 || lineNum > state.doc.lines) continue;
    const line = state.doc.line(lineNum);
    builder.add(line.from, line.from, Decoration.line({ class: cls }));
  }
  return builder.finish();
}

const baseTheme = EditorView.theme({
  '&': { fontSize: 'var(--fs-xs, 12px)', borderRadius: 'var(--radius)', overflow: 'hidden', height: '100%' },
  '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.5' },
  '.cm-gutters': { borderRight: '0.5px solid var(--border)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-diff-changed': { backgroundColor: 'color-mix(in srgb, var(--good) 12%, transparent)' },
  '.cm-diff-missing': { backgroundColor: 'color-mix(in srgb, var(--ring) 10%, transparent)' },
  '.cm-vimMode': {
    fontFamily: 'var(--mono)',
    fontSize: 'var(--fs-2xs, 9px)',
    padding: '2px 6px',
    color: 'var(--text-3)',
    borderTop: '0.5px solid var(--border)',
  },
});

/**
 * CodeMirror 6 for Code Studio. View created once per lang/minHeight; theme, vim, wrap,
 * readOnly, and decorations reconfigure live so toggles never discard edits.
 */
export function CodeMirrorEditor({
  value,
  lang = 'go',
  readOnly = false,
  minHeight = '320px',
  dark,
  themeKey,
  vim = false,
  wrap = false,
  onChange,
  lineDecorations,
  onView,
  className,
}: CodeMirrorEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeComp = useRef(new Compartment());
  const editComp = useRef(new Compartment());
  const decoComp = useRef(new Compartment());
  const vimComp = useRef(new Compartment());
  const wrapComp = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onViewRef = useRef(onView);
  onViewRef.current = onView;
  const lineDecoRef = useRef(lineDecorations);
  lineDecoRef.current = lineDecorations;
  const vimRef = useRef(vim);
  vimRef.current = vim;
  const wrapRef = useRef(wrap);
  wrapRef.current = wrap;

  useEffect(() => {
    if (!host.current) return;
    const isDark = dark ?? document.documentElement.classList.contains('dark');
    const langExt = languageExtension(lang);

    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          vimComp.current.of(vimExtensions(vimRef.current)),
          ...coreEditorExtensions(langExt),
          wrapComp.current.of(wrapExtensions(wrapRef.current)),
          editComp.current.of([EditorView.editable.of(!readOnly), EditorState.readOnly.of(readOnly)]),
          decoComp.current.of(
            EditorView.decorations.compute([], (state) => buildLineDecorations(state, lineDecoRef.current ?? new Map())),
          ),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current?.(u.state.doc.toString());
          }),
          EditorView.theme({ '.cm-content': { minHeight }, '.cm-editor': { height: '100%' } }),
          baseTheme,
          themeComp.current.of(buildEditorTheme(isDark)),
        ],
      }),
    });
    viewRef.current = view;
    onViewRef.current?.(view);
    return () => {
      onViewRef.current?.(null);
      view.destroy();
      viewRef.current = null;
    };
    // Created once per lang/minHeight; other props applied live below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, minHeight]);

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    const isDark = dark ?? document.documentElement.classList.contains('dark');
    v.dispatch({ effects: themeComp.current.reconfigure(buildEditorTheme(isDark)) });
  }, [dark, themeKey]);

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    v.dispatch({ effects: vimComp.current.reconfigure(vimExtensions(vim)) });
  }, [vim]);

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    v.dispatch({ effects: wrapComp.current.reconfigure(wrapExtensions(wrap)) });
  }, [wrap]);

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    v.dispatch({ effects: editComp.current.reconfigure([EditorView.editable.of(!readOnly), EditorState.readOnly.of(readOnly)]) });
  }, [readOnly]);

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    if (value !== v.state.doc.toString()) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    v.dispatch({
      effects: decoComp.current.reconfigure(
        EditorView.decorations.compute([], (state) => buildLineDecorations(state, lineDecorations ?? new Map())),
      ),
    });
  }, [lineDecorations]);

  return <div className={className ?? 'cm-host nodrag h-full min-h-0'} ref={host} />;
}
