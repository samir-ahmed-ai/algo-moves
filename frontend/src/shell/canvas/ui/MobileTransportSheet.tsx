import { useWorkspace } from '@/store/workspace';
import { TransportBar } from './TransportBarCore';
import { cn } from '@/lib/utils/cn';
import { X } from 'lucide-react';

/** Collapsible mobile transport — hamburger sheet on narrow viewports. */
export function MobileTransportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tweaks } = useWorkspace();
  if (!open || !tweaks.controls) return null;

  return (
    <>
      <div
        className="mobile-transport-sheet__backdrop fixed inset-0 z-40 bg-bg/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'mobile-transport-sheet fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-edge bg-[var(--surface-glass)] p-3 shadow-theme-xl backdrop-blur-xl md:hidden',
          'animate-in slide-in-from-bottom duration-200',
        )}
        role="dialog"
        aria-label="Transport controls"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="h-1.5 w-12 rounded-full bg-edge" aria-hidden />
          <span className="text-[length:var(--fs-tight)] font-semibold uppercase tracking-[0.14em] text-ink3">
            Transport
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
            aria-label="Close transport controls"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <TransportBar />
      </div>
    </>
  );
}
