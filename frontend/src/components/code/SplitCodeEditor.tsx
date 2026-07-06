import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { diffChangedLines } from '@/lib/code';
import {
  CODE_SPLIT_MAX,
  CODE_SPLIT_MIN,
} from '@/lib/editor/resizeSplit';
import { useResizeSplit } from '@/hooks/useResizeSplit';
import { cn } from '@/lib/utils/cn';
import { nodeText } from '@/design/typography';

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
}

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
}: SplitCodeEditorProps) {
  const showLeft = !hideLeft || peekLeft;
  const leftView = useRef<EditorView | null>(null);
  const rightView = useRef<EditorView | null>(null);
  const syncing = useRef(false);

  const { containerRef, splitPct, handleProps } = useResizeSplit({
    direction: 'horizontal',
    splitPct: splitPctProp,
    onSplitPctChange,
    minPct: CODE_SPLIT_MIN,
    maxPct: CODE_SPLIT_MAX,
    defaultPct: 50,
  });

  const syncScroll = useCallback((from: EditorView, to: EditorView | null) => {
    if (!to || syncing.current) return;
    syncing.current = true;
    to.scrollDOM.scrollTop = from.scrollDOM.scrollTop;
    to.scrollDOM.scrollLeft = from.scrollDOM.scrollLeft;
    syncing.current = false;
  }, []);

  const [leftReady, setLeftReady] = useState(false);
  const [rightReady, setRightReady] = useState(false);

  useEffect(() => {
    const left = leftView.current;
    const right = rightView.current;
    if (!left || !right || !showLeft) return;
    const onLeft = () => syncScroll(left, right);
    const onRight = () => syncScroll(right, left);
    left.scrollDOM.addEventListener('scroll', onLeft, { passive: true });
    right.scrollDOM.addEventListener('scroll', onRight, { passive: true });
    return () => {
      left.scrollDOM.removeEventListener('scroll', onLeft);
      right.scrollDOM.removeEventListener('scroll', onRight);
    };
  }, [showLeft, leftReady, rightReady, syncScroll]);

  const [debouncedDraft, setDebouncedDraft] = useState(draft);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedDraft(draft), 150);
    return () => clearTimeout(t);
  }, [draft]);

  const lineDecorations = useMemo(() => {
    const changed = diffChangedLines(reference, debouncedDraft);
    const map = new Map<number, string>();
    for (const line of changed.draft) map.set(line, 'cm-diff-changed');
    return map;
  }, [reference, debouncedDraft]);

  const leftDecorations = useMemo(() => {
    if (!showLeft) return undefined;
    const changed = diffChangedLines(reference, debouncedDraft);
    const map = new Map<number, string>();
    for (const line of changed.reference) map.set(line, 'cm-diff-missing');
    return map;
  }, [reference, debouncedDraft, showLeft]);

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-1 gap-0 overflow-hidden rounded-lg border border-edge">
      {showLeft && (
        <>
          <div className="flex min-h-0 min-w-0 flex-col" style={{ width: `${splitPct}%` }}>
            <div className={cn('shrink-0 border-b border-edge bg-panel2 px-2.5 py-1 font-mono uppercase tracking-wide text-ink3', nodeText['2xs'])}>
              Reference
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <CodeMirrorEditor
                value={reference}
                lang={lang}
                readOnly
                dark={dark}
                themeKey={themeKey}
                vim={vim}
                wrap={wrap}
                minHeight="100%"
                lineDecorations={leftDecorations}
                onView={(v) => {
                  leftView.current = v;
                  setLeftReady(!!v);
                }}
              />
            </div>
          </div>
          <div
            {...handleProps}
            className="nodrag flex w-2 shrink-0 cursor-col-resize items-stretch justify-center px-0.5"
          >
            <div className="split-handle h-full w-px bg-edge transition-colors hover:bg-accent" />
          </div>
        </>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className={cn('shrink-0 border-b border-edge bg-panel2 px-2.5 py-1 font-mono uppercase tracking-wide text-ink3', nodeText['2xs'])}>
          Your attempt
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <CodeMirrorEditor
            value={draft}
            lang={lang}
            dark={dark}
            themeKey={themeKey}
            vim={vim}
            wrap={wrap}
            minHeight="100%"
            lineDecorations={lineDecorations}
            onChange={onDraftChange}
            onView={(v) => {
              rightView.current = v;
              setRightReady(!!v);
            }}
          />
        </div>
      </div>
    </div>
  );
}
