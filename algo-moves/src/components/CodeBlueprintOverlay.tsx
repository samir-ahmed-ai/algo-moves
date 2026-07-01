import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { CodeBlueprintPanel, type CodeBlueprintPanelProps } from './CodeBlueprintPanel';

export type CodeBlueprintOverlayProps = Omit<CodeBlueprintPanelProps, 'inline' | 'closeRef'>;

/** Desktop full-page modal for the solution blueprint. */
export function CodeBlueprintOverlay({ pieces, lang, wrap = false, onClose }: CodeBlueprintOverlayProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div className={cn('code-blueprint-overlay nodrag')} role="dialog" aria-modal="true" aria-label="Solution blueprint">
      <button type="button" className="code-blueprint-backdrop" aria-label="Close blueprint" onClick={onClose} />
      <CodeBlueprintPanel pieces={pieces} lang={lang} wrap={wrap} onClose={onClose} closeRef={closeRef} />
    </div>,
    document.body,
  );
}
