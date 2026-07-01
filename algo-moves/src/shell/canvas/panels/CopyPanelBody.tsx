import { useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useCanvasStatic } from '../CanvasContext';
import { Btn, Code, Hint } from '../nodeui';
import { codeVariants, LangTabs } from './shared/codeVariants';

export function CopyPanelBody() {
  const { plugin } = useCanvasStatic();
  const variants = codeVariants(plugin);
  const [active, setActive] = useState(0);
  const variant = variants[Math.min(active, Math.max(variants.length - 1, 0))];
  const code = variant?.text ?? '// no source available';
  const file = variant?.file ?? 'solution';
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const preRef = useRef<HTMLPreElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 1400);
    } catch {
      const pre = preRef.current;
      const sel = window.getSelection();
      if (pre && sel) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      setStatus('failed');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <LangTabs variants={variants} active={active} onPick={setActive} />
        <span className="flex-1" />
        <Btn
          variant="good"
          size="sm"
          onClick={copy}
          icon={status === 'copied' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        >
          {status === 'copied' ? 'Copied' : 'Copy'}
        </Btn>
      </div>
      {status === 'failed' && <Hint>Selected — press ⌘/Ctrl+C to copy.</Hint>}
      <Code text={code} file={file} preRef={preRef} />
    </div>
  );
}
