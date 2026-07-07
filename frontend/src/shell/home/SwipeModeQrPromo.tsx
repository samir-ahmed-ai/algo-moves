import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Smartphone, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { COPY_FEEDBACK_MS } from '../copyFeedback';
import { cn } from '@/lib/utils/cn';
import { buildMobileModeUrl } from '@/lib/navigation';
import { markSwipeQrPromoDismissed } from './swipeQrPromoState';

export function SwipeModeQrPromo({ onOpenDevice }: { onOpenDevice: () => void }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const url = buildMobileModeUrl();
  const isLocalhost =
    typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

  const closePanel = useCallback(() => {
    setOpen(false);
    markSwipeQrPromoDismissed();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closePanel();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, closePanel]);

  const copy = () => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? closePanel() : setOpen(true))}
        title="Open Swipe mode on your phone"
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-panel/60 px-2.5 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accentbg hover:text-accent',
          open && 'border-accent bg-accentbg text-accent',
        )}
      >
        <Smartphone className="h-3.5 w-3.5" />
        <span>Swipe mode</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Open Swipe mode on your phone"
          className="absolute right-0 top-full z-50 mt-1.5 w-[min(90vw,16rem)] rounded-lg border border-edge bg-panel p-3 shadow-theme-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-ink">Open on your phone</p>
            <button
              type="button"
              onClick={closePanel}
              aria-label="Close"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink3 hover:bg-panel2 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-0.5 text-[length:var(--fs-tight)] leading-relaxed text-ink3">
            Scan the QR code or copy the link.
          </p>
          <div className="mx-auto mt-3 grid w-fit place-items-center rounded-md border border-edge bg-white p-2">
            <QRCodeSVG value={url} size={144} level="M" title="Swipe mode URL" />
          </div>
          <input
            readOnly
            value={url}
            aria-label="Swipe mode URL"
            className="mt-3 w-full truncate rounded border border-edge bg-panel2 px-2 py-1 font-mono text-[length:var(--fs-2xs)] text-ink2"
          />
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={copy}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-edge px-2 py-1.5 text-xs text-ink2 hover:bg-panel2"
            >
              {copied ? <Check className="h-3 w-3 text-good" /> : <Copy className="h-3 w-3" />}
              Copy link
            </button>
            <button
              type="button"
              onClick={() => {
                closePanel();
                onOpenDevice();
              }}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Open here
            </button>
          </div>
          {isLocalhost && (
            <p className="mt-2 text-[length:var(--fs-2xs)] leading-relaxed text-ink3">
              For phone scanning, open this page via the{' '}
              <strong className="font-medium text-ink2">Network</strong> URL from the dev server
              terminal (same Wi‑Fi).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
