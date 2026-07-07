import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Lock, Unlock } from 'lucide-react';
import type { EditorView } from '@codemirror/view';
import { CodeMirrorEditor } from '@/components/code/CodeMirrorEditor';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { COPY_FEEDBACK_MS } from '@/shell/copyFeedback';

import { useSubDocSyncContext, SUBDOC_TAG, useCanvasCollab } from '@/shell/canvas';
import { type EditorPayload } from '@/shell/canvas';
const LANGS = [
  { id: 'javascript', label: 'JS' },
  { id: 'typescript', label: 'TS' },
  { id: 'python', label: 'Py' },
  { id: 'go', label: 'Go' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
];

export function CollabCodeStudioToolbar() {
  const sync = useSubDocSyncContext();
  const { isHost } = useCanvasCollab();
  const payload = sync.payload as EditorPayload;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload.text);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="nodrag flex min-w-0 flex-1 flex-wrap items-center gap-1">
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          disabled={sync.readOnly}
          onClick={() => sync.setPayload({ ...payload, language: l.id })}
          className={cn(
            'rounded-md px-1.5 py-0.5 font-medium transition-colors',
            chromeText.xs,
            payload.language === l.id ? 'bg-accent/15 text-accent' : 'text-ink3 hover:text-ink',
          )}
        >
          {l.label}
        </button>
      ))}
      <span className="mx-0.5 h-3 w-px bg-edge" aria-hidden />
      <button
        type="button"
        onClick={copy}
        className="rounded-md p-1 text-ink3 transition-colors hover:text-ink"
        title="Copy"
      >
        <Copy className="h-3 w-3" />
      </button>
      {copied && <span className={cn('text-good', chromeText.xs)}>Copied</span>}
      {isHost && (
        <button
          type="button"
          onClick={() => sync.setLocked(!sync.locked)}
          className={cn(
            'rounded-md p-1 text-ink3 transition-colors hover:text-ink',
            sync.locked && 'text-bad',
          )}
          title={sync.locked ? 'Unlock editor' : 'Lock editor for candidates'}
        >
          {sync.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        </button>
      )}
      {sync.isLive && (
        <span className={cn('ml-auto font-medium text-good', chromeText.xs)}>Live</span>
      )}
    </div>
  );
}

export function CollabCodeStudioBody() {
  const sync = useSubDocSyncContext();
  const { emitSubDoc, isCollaborating } = useCanvasCollab();
  const payload = sync.payload as EditorPayload;
  const [wrap, setWrap] = useState(true);
  const viewRef = useRef<EditorView | null>(null);
  const lastCursorEmit = useRef(0);

  const onChange = useCallback(
    (text: string) => sync.setPayload({ ...payload, text }),
    [sync, payload],
  );

  // Emit cursor position on selection change via polling the view
  useEffect(() => {
    if (!isCollaborating || !viewRef.current) return;
    const view = viewRef.current;
    const iv = setInterval(() => {
      const sel = view.state.selection.main;
      const line = view.state.doc.lineAt(sel.head);
      const now = Date.now();
      if (now - lastCursorEmit.current < 100) return;
      lastCursorEmit.current = now;
      emitSubDoc({
        [SUBDOC_TAG]: 'cursor',
        nodeId: 'collab-code',
        kind: 'collab-code',
        x: 0,
        y: 0,
        line: line.number,
      });
    }, 200);
    return () => clearInterval(iv);
  }, [isCollaborating, emitSubDoc]);

  const remoteCursorLines = sync.remoteCursors
    .filter((c) => c.line != null)
    .map((c) => ({ name: c.name, color: c.color, line: c.line! }));

  return (
    <div className="nowheel flex min-h-[280px] flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-1 px-1 pb-0.5">
        {remoteCursorLines.length > 0 && (
          <div className="flex items-center gap-1">
            {remoteCursorLines.map((c) => (
              <span
                key={c.name}
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-sm px-1 py-px',
                  chromeText.xs,
                )}
                style={{ backgroundColor: `${c.color}20`, color: c.color }}
              >
                L{c.line} {c.name}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setWrap((v) => !v)}
          className={cn(
            'ml-auto rounded px-1.5 py-0.5 text-ink3 hover:text-ink',
            chromeText.xs,
            wrap && 'text-accent',
          )}
        >
          Wrap {wrap ? 'on' : 'off'}
        </button>
      </div>
      <CodeMirrorEditor
        value={payload.text}
        lang={payload.language}
        readOnly={sync.readOnly}
        wrap={wrap}
        dark={sync.dark}
        minHeight="280px"
        onChange={onChange}
        onView={(v) => {
          viewRef.current = v;
        }}
        className="h-full min-h-0 flex-1"
      />
    </div>
  );
}

/** Panel body entry — toolbar lives in PanelNode header for collab-code. */
export function CollabEditorPanelBody() {
  return <CollabCodeStudioBody />;
}
