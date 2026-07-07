import { useRef, useState } from 'react';
import { Check, Code2, Copy } from 'lucide-react';
import { HighlightedCode } from '@/components/code/HighlightedCode';
import { COPY_FEEDBACK_MS } from '../../copyFeedback';
import { codeVariants, LangTabs } from '../shared/codeVariants';

import { useCanvasStatic, Btn, Hint, nodeIconGlyph } from '@/shell/canvas';
export function CopyPanelBody() {
  const { plugin } = useCanvasStatic();
  const variants = codeVariants({
    ...(plugin.code !== undefined ? { code: plugin.code } : {}),
    ...(plugin.extraCode !== undefined ? { extraCode: plugin.extraCode } : {}),
  });
  const [active, setActive] = useState(0);
  const variant = variants[Math.min(active, Math.max(variants.length - 1, 0))];
  const code = variant?.text ?? '// no source available';
  const file = variant?.file ?? 'solution';
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const codeRef = useRef<HTMLDivElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), COPY_FEEDBACK_MS);
    } catch {
      const block = codeRef.current;
      const sel = window.getSelection();
      if (block && sel) {
        const range = document.createRange();
        range.selectNodeContents(block);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      setStatus('failed');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  return (
    <div className="code-panel code-panel--copy source-panel-shell flex min-h-0 flex-col gap-2">
      <div className="source-panel-toolbar flex items-center gap-2 rounded-lg border border-edge bg-panel2/40 px-2 py-1.5">
        <LangTabs variants={variants} active={active} onPick={setActive} />
        <span className="source-file-pill inline-flex min-w-0 items-center gap-1.5 rounded-md border border-edge bg-panel/70 px-2 py-1 font-mono text-[length:var(--fs-2xs)] text-ink2">
          <Code2 className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="truncate">{file}</span>
        </span>
        <span className="flex-1" />
        <Btn
          variant="good"
          size="sm"
          onClick={copy}
          icon={
            status === 'copied' ? (
              <Check className={nodeIconGlyph} />
            ) : (
              <Copy className={nodeIconGlyph} />
            )
          }
        >
          {status === 'copied' ? 'Copied' : 'Copy'}
        </Btn>
      </div>
      {status === 'failed' && <Hint>Selected — press ⌘/Ctrl+C to copy.</Hint>}
      <div
        ref={codeRef}
        className="source-code-frame min-h-0 overflow-hidden rounded-lg border border-edge bg-panel shadow-[var(--shadow-sm)]"
      >
        <HighlightedCode
          code={code}
          lang={variant?.lang ?? 'go'}
          gutter
          className="source-panel-code ws-scroll min-h-[12rem] overflow-auto p-3 font-mono sm:p-4"
        />
      </div>
    </div>
  );
}
