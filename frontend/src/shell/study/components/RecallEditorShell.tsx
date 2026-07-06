import { useEffect, useRef, useState } from 'react';
import { SplitCodeEditor } from '@/components/code/SplitCodeEditor';
import { cn } from '@/lib/utils/cn';
import type { EditorPrefs } from '@/store/user-prefs';
import { RecallEditorFooter } from './RecallEditorFooter';

/** Split merge editor + footer controls — shared by RecallPane and Code Studio body. */
export function RecallEditorShell({
  reference,
  draft,
  lang,
  dark,
  themeKey,
  editorPrefs,
  setEditorPrefs,
  blind,
  peek,
  onDraftChange,
  compact,
  mistakeTick,
}: {
  reference: string;
  draft: string;
  lang?: string;
  dark?: boolean;
  themeKey?: string;
  editorPrefs: EditorPrefs;
  setEditorPrefs: (patch: Partial<EditorPrefs>) => void;
  blind: boolean;
  peek: boolean;
  onDraftChange: (value: string) => void;
  compact?: boolean;
  /** Bumped by useRecallDraftChange every time a mistake resets the draft — triggers a shake. */
  mistakeTick?: number;
}) {
  const [shaking, setShaking] = useState(false);
  const prevTickRef = useRef(mistakeTick);

  useEffect(() => {
    if (mistakeTick === undefined || mistakeTick === prevTickRef.current) return;
    prevTickRef.current = mistakeTick;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 420);
    return () => clearTimeout(t);
  }, [mistakeTick]);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', shaking && 'cm-recall-shake')}>
      <SplitCodeEditor
        reference={reference}
        draft={draft}
        lang={lang}
        dark={dark}
        themeKey={themeKey}
        vim={true}
        wrap={editorPrefs.wrap}
        hideLeft={blind}
        peekLeft={peek}
        splitPct={editorPrefs.splitPct}
        onSplitPctChange={(splitPct) => setEditorPrefs({ splitPct })}
        onDraftChange={onDraftChange}
        pointerMode={editorPrefs.pointerMode}
        reveal={editorPrefs.recallReveal}
        mergeGutter={editorPrefs.mergeGutter}
        mergeCollapse={editorPrefs.mergeCollapse}
        highlightChanges={editorPrefs.highlightChanges}
        showLineNumbers={editorPrefs.showLineNumbers}
        showPointer={editorPrefs.showPointer}
        fontSize={editorPrefs.fontSize}
        lineHeight={editorPrefs.lineHeight}
        compact={compact}
      />
      <RecallEditorFooter editorPrefs={editorPrefs} setEditorPrefs={setEditorPrefs} compact={compact} />
    </div>
  );
}
